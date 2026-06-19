import { Router } from "express";
import { MercadoPagoConfig, PreApproval } from "mercadopago";
import { pool } from "../db/pool";
import { requireAuth, AuthedRequest } from "../services/auth";

export const billingRouter = Router();

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!
});

// Os dois planos pagos. "free" não passa por aqui.
const PLANS: Record<string, { label: string; price: number }> = {
  basico: { label: "GeoManager Básico", price: 9.9 },
  pro: { label: "GeoManager Pro", price: 9.9 } // ajuste o preço do Pro depois; teto de R$10 pedido pelo cliente
};

// Cria uma assinatura recorrente (preapproval) no Mercado Pago e devolve o link de pagamento
billingRouter.post("/subscribe", requireAuth, async (req: AuthedRequest, res) => {
  const { plan } = req.body ?? {};
  const planDef = PLANS[plan];
  if (!planDef) {
    return res.status(400).json({ error: "Plano inválido. Use 'basico' ou 'pro'." });
  }

  const userResult = await pool.query("SELECT email FROM users WHERE id = $1", [req.userId]);
  const email = userResult.rows[0]?.email;
  if (!email) return res.status(404).json({ error: "Usuário não encontrado" });

  const preApproval = new PreApproval(mpClient);

  const subscription = await preApproval.create({
    body: {
      reason: planDef.label,
      payer_email: email,
      external_reference: req.userId,
      back_url: process.env.APP_URL + "/conta/assinatura",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: planDef.price,
        currency_id: "BRL"
      },
      status: "pending"
    }
  });

  await pool.query("UPDATE users SET mp_subscription_id = $1 WHERE id = $2", [subscription.id, req.userId]);

  res.json({ checkoutUrl: subscription.init_point });
});

// Webhook do Mercado Pago — chamado automaticamente quando o status da assinatura muda
billingRouter.post("/webhook", async (req, res) => {
  const event = req.body;

  try {
    if (event.type === "subscription_preapproval" || event.action?.includes("preapproval")) {
      const preApproval = new PreApproval(mpClient);
      const data = await preApproval.get({ id: event.data.id });

      const userId = data.external_reference;
      const status = data.status; // authorized | paused | cancelled
      const plan = status === "authorized" ? (data.reason?.includes("Pro") ? "pro" : "basico") : "free";
      const planStatus = status === "authorized" ? "active" : status === "paused" ? "past_due" : "canceled";

      if (userId) {
        await pool.query("UPDATE users SET plan = $1, plan_status = $2 WHERE id = $3", [plan, planStatus, userId]);
      }
    }
    res.sendStatus(200);
  } catch (err) {
    console.error("Erro processando webhook do Mercado Pago", err);
    res.sendStatus(200); // sempre 200 para o MP não ficar reenviando indefinidamente
  }
});

billingRouter.get("/plans", (_req, res) => {
  res.json([
    { id: "free", label: "Gratuito", price: 0, maps: 2, features: "Até 200 feições por mapa" },
    { id: "basico", label: "Básico", price: 9.9, maps: 15, features: "Até 2.000 feições por mapa, exportação ilimitada" },
    { id: "pro", label: "Pro", price: 9.9, maps: 100, features: "Até 20.000 feições por mapa, colaboração e embed" }
  ]);
});
