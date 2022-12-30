import React, { ChangeEvent, useState, ComponentType } from "react";
import { createDockerDesktopClient } from "@docker/extension-api-client";
import {
  Box, Stepper, Step, StepLabel, Button, Grid, Stack, Alert, TextField, Typography,
} from "@mui/material";

import {
  deployKubescapeHelm,
} from "./helper/kubernetes";

// Note: This line relies on Docker Desktop's presence as a host application.
// If you're running this React app in a browser, it won't work properly.
const client = createDockerDesktopClient();

function useDockerDesktopClient() {
  return client;
}

const kubescapeSignupURL = "https://cloud.armosec.io/account/sign-up"
const kubescapeDashboardURL = "https://cloud.armosec.io/dashboard"
const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

type ScreenProps = {
  backFn: () => void
  nextFn: () => void
}

type PageProps = ScreenProps & {
  component: ComponentType<ScreenProps>
}

const Page = ({ component, backFn, nextFn }: PageProps) => {
  const SpecificPage = component
  return (
    <SpecificPage backFn={backFn} nextFn={nextFn} />
  )
}

const SignUpScreen = (props: ScreenProps) => {
  const openKubescapeSignup = () => {
    client.host.openExternal(kubescapeSignupURL)
  }

  return (
    <>
      <Typography>
        To help you elevate the security of your Kubernetes cluster and provide you with the best insights, we need to connect to your Kubescape Cloud account. If you don’t have one yet, press the “Sign Up” button below and create the account by following the instructions. If you already have an account, feel free to jump to the next step.
      </Typography>
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
        <Button disabled variant="text">
          Back
        </Button>
        <Button variant="outlined" onClick={openKubescapeSignup}>
          Sign Up
        </Button>
        <Button variant="contained" onClick={props.nextFn}>
          Next
        </Button>
      </Stack>
    </>
  )
}

const DeployScreen = (props: ScreenProps) => {
  const [response, setResponse] = useState<string | undefined>();
  const [accountID, setAccountID] = useState<string>("");
  const [accountIDInvalid, setAccountIDInvalid] = useState<boolean>(true);
  const [kubescapeDeployed, setKubescapeDeployed] = useState<boolean>(false);

  const ddClient = useDockerDesktopClient();

  const handleTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    let inputValue = event.currentTarget.value.toLowerCase()
    if (uuidRegex.test(inputValue)) {
      setAccountIDInvalid(false)
      setAccountID(inputValue)
    } else {
      setAccountIDInvalid(true)
    }
  }

  const handleDeployRequest = async () => {
    const result = await deployKubescapeHelm(ddClient, accountID);
    setResponse(result);
    setKubescapeDeployed(true)
  }

  return (
    <>
      <Typography>
        Before Kubescape can help you secure your cluster, please first make sure that the cluster is running. Once your cluster is ready, Kubescape needs your Kubescape Cloud Account ID to deploy. To get the Account ID, log into Kubescape Cloud, click on your Account icon, press the “Copy” button next to your Account ID to copy the account ID, paste it into the input and then deploy Kubescape.
      </Typography>

      {
        kubescapeDeployed && <Alert></Alert>
      }

      {kubescapeDeployed ? (
        <Alert severity="success" sx={{ mt: 2 }}>
          Kubescape has been successfully deployed!
        </Alert>
      ) : (
        null
      )}

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Stack direction="row" alignItems="start" spacing={2} sx={{ mt: 4 }} justifyContent="space-between">
            <TextField
              error={accountIDInvalid}
              variant="standard"
              onChange={handleTextChange}
              label="Your Kubescape account ID"
              sx={{ width: "50%" }}
            />
            <Button
              disabled={kubescapeDeployed}
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
      <Grid item sx={{ mt: 2 }}>
        <Stack direction="row" justifyContent="space-between">
          <Button variant="text" onClick={props.backFn}>
            Back
          </Button>
          <Button disabled={!kubescapeDeployed} onClick={props.nextFn}>
            Next
          </Button>
        </Stack>
      </Grid>
    </>
  )
}

const MonitorScreen = (props: ScreenProps) => {
  const openDashboard = () => {
    client.host.openExternal(kubescapeDashboardURL)
  }
  return (
    <>
      <Typography>
        Now that Kubescape has been successfully deployed in your cluster, take a look at your Kubescape Cloud dashboard to check how your secure is your cluster and what you can do to improve your security posture.
      </Typography>
      <Stack direction="row" justifyContent="space-between">
        <Button variant="text" onClick={props.backFn}>
          Back
        </Button>
        <Button onClick={openDashboard}>
          Open Dashboard
        </Button>
      </Stack>
    </>
  )
}

const steps = [
  {
    label: "Sign Up",
    optional: false,
    payload: SignUpScreen,
  },
  {
    label: "Secure",
    optional: false,
    payload: DeployScreen,
  },
  {
    label: "Monitor",
    optional: false,
    payload: MonitorScreen,
  }
];

function HorizontalLinearStepper() {
  const [activeStep, setActiveStep] = useState(0);
  const [skipped, setSkipped] = useState(new Set<number>());

  const isStepOptional = (step: number) => getStep(step).optional;

  const isStepSkipped = (step: number) => skipped.has(step);

  const handleNext = () => {
    let newSkipped = skipped;
    if (isStepSkipped(activeStep)) {
      newSkipped = new Set(newSkipped.values());
      newSkipped.delete(activeStep);
    }

    setActiveStep((prevActiveStep) => prevActiveStep + 1);
    setSkipped(newSkipped);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSkip = () => {
    if (!isStepOptional(activeStep)) {
      // You probably want to guard against something like this,
      // it should never occur unless someone's actively trying to break something.
      throw new Error("You can't skip a step that isn't optional.");
    }

    setActiveStep((prevActiveStep) => prevActiveStep + 1);
    setSkipped((prevSkipped) => {
      const newSkipped = new Set(prevSkipped.values());
      newSkipped.add(activeStep);
      return newSkipped;
    });
  };

  const handleReset = () => {
    setActiveStep(0);
  };

  const getStep = (step: number) => steps[step]

  return (
    <Box sx={{ width: '100%' }}>
      <Stepper activeStep={activeStep} sx={{ mt: "1em" }}>
        {steps.map((step, index) => {
          const stepProps: { completed?: boolean } = {};
          const labelProps: {
            optional?: React.ReactNode;
          } = {};
          if (isStepOptional(index)) {
            labelProps.optional = (
              <Typography variant="caption">Optional</Typography>
            );
          }
          if (isStepSkipped(index)) {
            stepProps.completed = false;
          }
          return (
            <Step key={step.label} {...stepProps}>
              <StepLabel {...labelProps}>{step.label}</StepLabel>
            </Step>
          );
        })}
      </Stepper>
      {activeStep === steps.length ? (
        <>
          <Typography sx={{ mt: 2, mb: 1 }}>
            All steps completed - you&apos;re finished
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
            <Box sx={{ flex: '1 1 auto' }} />
            <Button onClick={handleReset}>Reset</Button>
          </Box>
        </>
      ) : (
        <>
          <Typography variant="h3" sx={{ mt: 2, mb: 1 }}>Step {activeStep + 1}: {getStep(activeStep).label}</Typography>
          <Page component={getStep(activeStep).payload} backFn={handleBack} nextFn={handleNext} />
        </>
      )}
    </Box>
  );
}

export function App() {
  return (
    <>
      <Typography variant="h3">Kubescape</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
        Kubescape is a service that aims to secure your Kubernetes clusters by
        scanning it for misconfigurations and vulnerabilities and offering
        remediation where possible.
      </Typography>

      <HorizontalLinearStepper />
    </>
  );
}
