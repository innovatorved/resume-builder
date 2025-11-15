import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

console.log("[AUTH-ROUTE] Setting up auth route handlers...");

const handlers = toNextJsHandler(auth);

console.log("[AUTH-ROUTE] Handlers created:", {
  hasGET: !!handlers.GET,
  hasPOST: !!handlers.POST,
});

// Wrap handlers with logging
const originalGET = handlers.GET;
const originalPOST = handlers.POST;

export const GET = async (req: Request, context: any) => {
  console.log("[AUTH-ROUTE] GET request:", {
    url: req.url,
    timestamp: new Date().toISOString(),
  });
  try {
    const response = await originalGET(req, context);
    console.log("[AUTH-ROUTE] GET response:", {
      status: response.status,
      statusText: response.statusText,
    });
    return response;
  } catch (error) {
    console.error("[AUTH-ROUTE] GET error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};

export const POST = async (req: Request, context: any) => {
  console.log("[AUTH-ROUTE] POST request:", {
    url: req.url,
    timestamp: new Date().toISOString(),
  });
  try {
    const response = await originalPOST(req, context);
    console.log("[AUTH-ROUTE] POST response:", {
      status: response.status,
      statusText: response.statusText,
    });
    return response;
  } catch (error) {
    console.error("[AUTH-ROUTE] POST error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};
