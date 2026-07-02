import express from "express";
import "dotenv/config";
import path from "path";
import multer from "multer";
const app = express();
const port = Number(process.env.PORT) || 4000;
import { connectDB } from "./config/db";
import authRouter from "./routes/auth.route";
import userRouter from "./routes/user.route";
import attendanceRouter from "./routes/attendance.route";
import settingRouter from "./routes/setting.route";
import timeSettingRouter from "./routes/timeSetting.route";
import scheduleRouter from "./routes/schedule.route";
import operationalRecordRouter from "./routes/operationalRecord.route";
import researchRouter from "./routes/research.route";
import competitionRouter from "./routes/competition.route";
import brandingRouter from "./routes/branding.route";
import kpiItemRouter from "./routes/kpi.route";
import productRouter from "./routes/product.route";
import debugRouter from "./routes/debug.route";
import cors from "cors";

connectDB();
app.use(cors());

// Middleware untuk handle multipart vs JSON
app.use((req, res, next) => {
  next();
});

// Middleware untuk handle multipart vs JSON
const contentTypeHandler = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const contentType = req.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    // Skip json/urlencoded, let multer handle it in route
    next();
  } else if (contentType.includes("application/json")) {
    express.json()(req, res, next);
  } else if (contentType.includes("application/x-www-form-urlencoded")) {
    express.urlencoded({ extended: true })(req, res, next);
  } else {
    express.json()(req, res, next);
  }
};

app.use(contentTypeHandler);

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

app.use("/auth", authRouter);
app.use("/users", userRouter);
app.use("/attendance", attendanceRouter);
app.use("/setting", settingRouter);
app.use("/time-setting", timeSettingRouter);
app.use("/schedules", scheduleRouter);
app.use("/operational-records", operationalRecordRouter);
app.use("/research", researchRouter);
app.use("/competition", competitionRouter);
app.use("/branding", brandingRouter);
app.use("/kpi", kpiItemRouter);
app.use("/products", productRouter);
app.use("/debug", debugRouter);

app.listen(port,"0.0.0.0",() => {
  console.log(`App listening on http://localhost:${port}`);
});
