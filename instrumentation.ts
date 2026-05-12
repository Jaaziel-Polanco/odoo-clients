export const register = async () => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startSyncScheduler } = await import("@/lib/sync/scheduler");
  startSyncScheduler();
};
