import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../contexts/AuthContext";

interface Plan {
  id: string;
  label: string;
  price: number;
  maps: number;
  features: string;
}

export default function PlansModal({ onClose }: { onClose: () => void }) {
  const { token, user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  useEffect(() => {
    api.getPlans().then(setPlans).catch(() => {});
  }, []);

  async function handleSubscribe(planId: string) {
    if (!token) return;
    setLoadingPlan(planId);
    try {
      const { checkoutUrl } = await api.subscribe(token, planId);
      window.location.href = checkoutUrl;
    } catch (err: any) {
      alert(err.message || "Não foi possível iniciar o checkout");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card plans-card" onClick={(e) => e.stopPropagation()}>
        <h2>Planos</h2>
        <div className="plans-grid">
          {plans.map((plan) => (
            <div key={plan.id} className={`plan-card ${user?.plan === plan.id ? "current" : ""}`}>
              <h3>{plan.label}</h3>
              <p className="plan-price">{plan.price === 0 ? "Grátis" : `R$ ${plan.price.toFixed(2).replace(".", ",")}/mês`}</p>
              <p className="plan-detail">Até {plan.maps} mapas</p>
              <p className="plan-detail">{plan.features}</p>
              {plan.id === "free" ? (
                <button disabled>Plano atual de entrada</button>
              ) : user?.plan === plan.id ? (
                <button disabled>Plano ativo</button>
              ) : (
                <button onClick={() => handleSubscribe(plan.id)} disabled={loadingPlan === plan.id}>
                  {loadingPlan === plan.id ? "Abrindo checkout..." : "Assinar com Mercado Pago"}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
