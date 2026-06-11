import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("deliver nudges", { minutes: 15 }, internal.nudges.deliver, {});

export default crons;
