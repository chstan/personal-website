import { defineRailway, github, project, service } from "railway/iac";

// This repository manages only its own resources in the environment. Other
// repositories export their own partial name.
// See https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = "personal-website";

export default defineRailway(() => {
  const personal_website = service("personal-website", {
    source: github("chstan/personal-website", { branch: "master" }),
    build: { builder: "DOCKERFILE", dockerfilePath: "Dockerfile" },
    // restartPolicyType is Railway's default (ON_FAILURE); declaring it
    // explicitly leaves a permanent diff because Railway stores it as null.
    deploy: { restartPolicyMaxRetries: 3 },
    // No `start`: the Dockerfile CMD runs under a shell so $PORT expands.
    healthcheck: "/",
    healthcheckTimeout: 30,
    variables: {
      // Pins the port the public domain routes to; the Dockerfile honors it.
      PORT: "8001",
    },
  });
  return project("serene-laughter", {
    resources: [personal_website],
  });
});
