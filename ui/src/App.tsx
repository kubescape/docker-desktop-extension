import React, { ChangeEvent, useState, ComponentType } from "react";
import { createDockerDesktopClient } from "@docker/extension-api-client";
import { LoadingButton } from "@mui/lab";
import {
  Box, Container, Stepper, Step, StepLabel, Button, Grid, Stack, Alert, Snackbar, TextField, Typography, Paper
} from "@mui/material";
import PolicyIcon from "@mui/icons-material/Policy";
import GppGoodIcon from "@mui/icons-material/GppGood";
import KeyboardArrowLeft from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";

import {
  deployKubescapeHelm,
} from "./helper/kubernetes";

const snackbarDuration = 5000;

const kubescapeSignupURL = "https://cloud.armosec.io/account/sign-up"
const kubescapeDashboardURL = "https://cloud.armosec.io/dashboard"

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
const invalidUUIDMessage = "Input is not a valid Account ID."

// Note: This line relies on Docker Desktop's presence as a host application.
// If you're running this React app in a browser, it won't work properly.
const client = createDockerDesktopClient();

function useDockerDesktopClient() {
  return client;
}

type PageProps = {
  initial: boolean
  optional: boolean
  final: boolean

  backFn: () => void
  nextFn: () => void

  setBackAvailable: (newValue: boolean) => void
  setNextAvailable: (newValue: boolean) => void

  onKubescapeDeploy: () => void
  onComplete: () => void
}

type GenericPageProps = PageProps & {
  component: ComponentType<PageProps>
}

const Page = (props: GenericPageProps) => {
  const SpecificPage = props.component

  // “Back" button is available by default for all pages, except the initial
  props.setBackAvailable(!props.initial)
  // "Next” is available by defautl only for the optional pages
  props.setNextAvailable(props.optional)

  const { component: _, ...specificProps } = props

  return (
    <SpecificPage
      {...specificProps}
    />
  )
}

const SignUpPage = (props: PageProps) => {
  const openKubescapeSignup = () => {
    client.host.openExternal(kubescapeSignupURL)
  }

  return (
    <>
      <Typography>
        To help you elevate the security of your Kubernetes cluster and provide you with the best insights, we need to connect to your ARMO Platform account. If you don’t have one yet, press the “Sign Up” button below and create the account by following the instructions. If you already have an account, feel free to jump to the next step.
      </Typography>
      <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
        <Button variant="outlined" onClick={openKubescapeSignup}>
          Sign Up
        </Button>
      </Stack>
    </>
  )
}

const SecurePage = (props: PageProps) => {
  const [accountID, setAccountID] = useState<string>("");

  const [accountIDInvalid, setAccountIDInvalid] = useState<boolean>(true);
  const [accountIDValidationText, setAccountIDValidationText] = useState<string>("");

  const [deployingKubescape, setDeployingKubescape] = useState<boolean>(false);
  const [kubescapeDeployed, setKubescapeDeployed] = useState<boolean>(false);

  const ddClient = useDockerDesktopClient();

  const handleTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    let inputValue = event.currentTarget.value.toLowerCase()
    if (uuidRegex.test(inputValue)) {
      setAccountIDInvalid(false)
      setAccountID(inputValue)
    } else {
      setAccountIDValidationText(invalidUUIDMessage)
      setAccountIDInvalid(true)
    }
  }

  const handleDeployRequest = async () => {
    setDeployingKubescape(true)
    await deployKubescapeHelm(ddClient, accountID)
    setDeployingKubescape(false)

    setKubescapeDeployed(true)

    props.onKubescapeDeploy()
  }

  props.setNextAvailable(kubescapeDeployed)

  return (
    <>
      <Typography>
        Before Kubescape can help you secure your cluster, please first make sure that the cluster is running. Once your cluster is ready, Kubescape needs your ARMO Platform Account ID to deploy. To get the Account ID, log into ARMO Platform, click on your Account dropdown, press the “Copy” button next to your Account ID to copy the Account ID, paste it into the input and then deploy Kubescape.
      </Typography>

      <Grid container direction="row" justifyContent="space-between" alignItems="bottom" spacing={2}>
        <Grid item xs={6}>
          <TextField
            fullWidth={true}
            error={accountIDInvalid}
            variant="standard"
            onChange={handleTextChange}
            helperText={accountIDInvalid && accountIDValidationText}
            label="Your Kubescape Account ID"
          />
        </Grid>
        <Grid item>
          <LoadingButton
            color={kubescapeDeployed ? "success" : "primary"}
            loading={deployingKubescape}
            loadingPosition="end"
            endIcon={kubescapeDeployed ? <GppGoodIcon /> : <PolicyIcon />}
            disabled={accountIDInvalid || kubescapeDeployed}
            variant="contained"
            onClick={handleDeployRequest}
          >
            {kubescapeDeployed ? "Secured" : "Secure with Kubescape"}
          </LoadingButton>
        </Grid>
      </Grid>
    </>
  )
}

const MonitorPage = () => {
  const openDashboard = () => {
    client.host.openExternal(kubescapeDashboardURL)
  }
  return (
    <>
      <Typography>
        Now that Kubescape has been successfully deployed in your cluster, take a look at your ARMO Platform dashboard to check how secure is your cluster and what you can do to improve your security posture.
      </Typography>
      <Stack direction="row" justifyContent="flex-end">
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
    optional: true,
    payload: SignUpPage,
  },
  {
    label: "Secure",
    optional: false,
    payload: SecurePage,
  },
];

function HorizontalLinearStepper() {
  const [activeStep, setActiveStep] = useState(0);
  const [skipped, setSkipped] = useState(new Set<number>());

  const [showDeployedSnackbar, setShowDeployedSnackbar] = useState<boolean>(false);

  const [backAvailable, setBackAvailable] = useState<boolean>(false);
  const [nextAvailable, setNextAvailable] = useState<boolean>(false);

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

  const getStep = (step: number) => steps[step];

  const flowCompleted = (step: number) => step === steps.length;

  return (
    <>
      <Stepper activeStep={activeStep} sx={{ mt: "1em" }}>
        {steps.map((step, index) => {
          const stepProps: { completed?: boolean } = {};
          const labelProps: {
            optional?: React.ReactNode;
          } = {};
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

      {flowCompleted(activeStep) ? (
        <Box>
          <Typography variant="h3" sx={{ mt: 3, mb: 1 }}>
            Kubescape is securing your cluster
          </Typography>
          <MonitorPage />
        </Box>
      ) : (
        <Box>
          <Typography variant="h3" sx={{ mt: 3, mb: 1 }}>Step {activeStep + 1}: {getStep(activeStep).label}</Typography>
          <Page
            component={getStep(activeStep).payload}
            optional={getStep(activeStep).optional}
            initial={activeStep === 0}
            final={activeStep === (steps.length - 1)}
            backFn={handleBack}
            nextFn={handleNext}
            onKubescapeDeploy={() => setShowDeployedSnackbar(true)}
            onComplete={() => setNextAvailable(true)}
            setBackAvailable={setBackAvailable}
            setNextAvailable={setNextAvailable}
          />

          <Snackbar
            open={showDeployedSnackbar}
            autoHideDuration={snackbarDuration}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            onClose={() => setShowDeployedSnackbar(false)}
          >
            <Alert severity="success" sx={{ mt: 2 }}>
              Kubescape has been successfully deployed!
            </Alert>
          </Snackbar>

          <Paper sx={{ position: "fixed", bottom: 0, left: 0, right: 0 }} elevation={3}>
            <Container maxWidth="md">
              <Stack direction="row" justifyContent="space-between">
                <Button
                  disabled={!backAvailable}
                  variant="text"
                  startIcon={<KeyboardArrowLeft />}
                  color="inherit"
                  onClick={handleBack}
                >
                  Back
                </Button>
                <Button
                  disabled={!nextAvailable}
                  variant="text"
                  endIcon={<KeyboardArrowRight />}
                  onClick={handleNext}
                >
                  Next
                </Button>
              </Stack>
            </Container>
          </Paper>
        </Box>
      )}
    </>
  );
}

export function App() {
  return (
    <Container maxWidth="md">
      <Grid container justifyContent="center">
        <Grid item>
          <Box>
            <Box
              component="img"
              src="images/kubescape-stacked-color.svg"
              height="12.5em"
            />
          </Box>
        </Grid>
      </Grid>

      <HorizontalLinearStepper />

    </Container>
  );
}
