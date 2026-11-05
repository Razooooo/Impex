import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import availabilityRoutes from "./routes/availabilityRoutes.js";
import garageRoutes from "./routes/garageRoutes.js";
import timeOffRoutes from "./routes/timeOffRoutes.js";
import { accountLimiter, apiLimiter, loginLimiter, rejectOperators } from "./middlewares/security.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";

const app = express();

// Derrière le proxy d'un hébergeur (Render…), la vraie adresse du visiteur est dans X-Forwarded-For.
// TRUST_PROXY=1 en production : la limitation des essais se base alors sur elle.
if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

// L'API est appelée depuis un autre domaine (le site), donc ses réponses doivent pouvoir être lues cross-origin
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: process.env.CLIENT_URL || true }));
app.use(express.json({ limit: "100kb" }));
app.use("/api", apiLimiter, rejectOperators);

app.get("/api/health", (_req, res) => {
	res.status(200).json({ status: "ok" });
});

app.use("/api/auth/login", loginLimiter);
app.use(["/api/auth/register", "/api/auth/demo", "/api/auth/forgot-password", "/api/auth/reset-password"], accountLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/garage", garageRoutes);
app.use("/api/timeoff", timeOffRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
