import React, { ChangeEvent, useState } from "react";
import Button from "@mui/material/Button";
import { createDockerDesktopClient } from "@docker/extension-api-client";
import { Grid, Stack, TextField, Typography } from "@mui/material";
import {
  deployKubescapeHelm,
} from "./helper/kubernetes";

// Note: This line relies on Docker Desktop's presence as a host application.
// If you're running this React app in a browser, it won't work properly.
const client = createDockerDesktopClient();

function useDockerDesktopClient() {
  return client;
}

export function App() {
  const [response, setResponse] = useState<string | undefined>();
  const [accountID, setAccountID] = useState<string>("");

  const ddClient = useDockerDesktopClient();

  const handleTextChange = async (event: ChangeEvent<HTMLInputElement>) => {
    setAccountID(event.currentTarget.value)
  }

  const handleDeployRequest = async () => {
    const result = await deployKubescapeHelm(ddClient, accountID);
    setResponse(result);
  }

  return (
    <>
      <Typography variant="h3">Kubescape</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
        Kubescape is a service that aims to secure your Kubernetes clusters by
        scanning it for misconfigurations and vulnerabilities and offering
        remediation where possible.
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Stack direction="row" alignItems="start" spacing={2} sx={{ mt: 4 }} justifyContent="space-between">
            <TextField
              variant="standard"
              onChange={handleTextChange}
              label="Your Kubescape account ID"
            />
            <Button
              variant="contained"
              onClick={handleDeployRequest}
            >
              Deploy Kubescape
            </Button>
          </Stack>
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Output"
            sx={{ width: "100%" }}
            disabled
            multiline
            variant="outlined"
            minRows={5}
            value={response ?? ""}
          />
        </Grid>
      </Grid>
    </>
  );
}
