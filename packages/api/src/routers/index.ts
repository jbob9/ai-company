import { protectedProcedure, publicProcedure, router } from "../index";
import { companyRouter } from "./company";
import { departmentRouter } from "./department";
import { metricsRouter } from "./metrics";
import { alertsRouter } from "./alerts";
import { recommendationsRouter } from "./recommendations";
import { aiRouter } from "./ai";
import { predictionsRouter } from "./predictions";

export const appRouter = router({
  // Health check
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),

  // Protected user data
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),

  // Domain routers
  company: companyRouter,
  department: departmentRouter,
  metrics: metricsRouter,
  alerts: alertsRouter,
  recommendations: recommendationsRouter,
  ai: aiRouter,
  predictions: predictionsRouter,
});

export type AppRouter = typeof appRouter;
