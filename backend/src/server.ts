import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { billingRouter } from "./routes/billing";
import { mapsRouter } from "./routes/maps";
import { publicMapsRouter } from "./routes/publicMaps";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use("/billing", billingRouter);
app.use("/maps", mapsRouter);
app.use("/public-maps", publicMapsRouter);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`GeoManager API rodando em http://localhost:${port}`);
});
