import {
	Form,
	ActionPanel,
	Action,
	showToast,
	Toast,
	popToRoot,
	Icon,
	Color,
} from "@vicinae/api";
import { useState } from "react";
import { EeroAPI, extractNetworkID, EeroAPIError } from "./api";
import { saveConfig } from "./utils";

const Login = () => {
	const [email, setEmail] = useState("");
	const [verificationCode, setVerificationCode] = useState("");
	const [isRequestingCode, setIsRequestingCode] = useState(false);
	const [isVerifying, setIsVerifying] = useState(false);
	const [codeRequested, setCodeRequested] = useState(false);
	const [error, setError] = useState<string>();
	const [userToken, setUserToken] = useState<string>("");

	/**
	 * Get user-friendly error message from API error
	 */
	const getErrorMessage = (error: any): string => {
		if (error instanceof EeroAPIError) {
			const message = error.message.toLowerCase();

			if (message.includes("login.blocked") || message.includes("blocked")) {
				return "Your account has been temporarily blocked due to too many login attempts. Please wait 10-15 minutes and try again.";
			}

			if (message.includes("invalid") || message.includes("incorrect")) {
				return "Invalid email, phone number, or verification code. Please check and try again.";
			}

			if (message.includes("expired")) {
				return "Verification code expired. Please request a new code.";
			}

			return error.message;
		}

		return error.message || "An unexpected error occurred";
	};

	/**
	 * Handle request verification code action
	 */
	const handleRequestCode = async (): Promise<void> => {
		if (!email.trim()) {
			setError("Please enter your email or phone number");
			return;
		}

		setIsRequestingCode(true);
		setError(undefined);

		try {
			await showToast({
				style: Toast.Style.Animated,
				title: "Requesting verification code...",
			});

			const api = new EeroAPI();
			const loginResponse = await api.login(email);

			setUserToken(loginResponse.user_token);
			setCodeRequested(true);

			await showToast({
				style: Toast.Style.Success,
				title: "Code sent successfully!",
				message: "Check your email or phone",
			});
		} catch (error: any) {
			const errorMessage = getErrorMessage(error);
			setError(errorMessage);
			await showToast({
				style: Toast.Style.Failure,
				title: "Failed to send code",
				message: errorMessage,
			});
		} finally {
			setIsRequestingCode(false);
		}
	};

	/**
	 * Handle verify code and complete login
	 */
	const handleVerify = async (): Promise<void> => {
		if (!verificationCode.trim()) {
			setError("Please enter the verification code");
			return;
		}

		setIsVerifying(true);
		setError(undefined);

		try {
			await showToast({
				style: Toast.Style.Animated,
				title: "Verifying code...",
			});

			const api = new EeroAPI();
			await api.loginVerify(userToken, verificationCode);

			const account = await api.getAccount();

			const config: { token: string; network_id?: string } = {
				token: userToken,
			};

			let networkName: string | undefined;
			if (account.networks.data.length > 0) {
				const network = account.networks.data[0];
				config.network_id = extractNetworkID(network.url);
				networkName = network.name;
			}

			await saveConfig(config);

			await showToast({
				style: Toast.Style.Success,
				title: "Welcome back!",
				message: networkName
					? `Connected to ${networkName}`
					: "Login successful",
			});

			popToRoot();
		} catch (error: any) {
			const errorMessage = getErrorMessage(error);
			setError(errorMessage);
			await showToast({
				style: Toast.Style.Failure,
				title: "Verification failed",
				message: errorMessage,
			});
		} finally {
			setIsVerifying(false);
		}
	};

	/**
	 * Handle reset to request new code
	 */
	const handleReset = (): void => {
		setCodeRequested(false);
		setVerificationCode("");
		setError(undefined);
		setUserToken("");
	};

	return (
		<Form
			actions={
				<ActionPanel>
					{!codeRequested ? (
						<Action
							title="Request Verification Code"
							icon={Icon.Envelope}
							onAction={handleRequestCode}
						/>
					) : (
						<>
							<Action
								title="Verify and Login"
								icon={Icon.CheckCircle}
								onAction={handleVerify}
							/>
							<Action
								title="Use Different Email/Phone"
								icon={Icon.ArrowCounterClockwise}
								onAction={handleReset}
								shortcut={{ modifiers: ["cmd"], key: "r" }}
							/>
						</>
					)}
				</ActionPanel>
			}
		>
			{!codeRequested ? (
				<>
					<Form.Description
						title="🔐 Authenticate with Eero"
						text="Enter your email address or phone number to receive a verification code."
					/>

					{error && (
						<>
							<Form.Separator />
							<Form.Description title="" text={`⚠️ ${error}`} />
							<Form.Separator />
						</>
					)}

					<Form.TextField
						id="email"
						title="Email or Phone"
						value={email}
						onChange={setEmail}
						info="You'll receive a 6-digit verification code"
					/>
				</>
			) : (
				<>
					<Form.Description
						title="✉️ Check Your Messages"
						text={`A verification code has been sent to:\n\n${email}\n\nEnter the 6-digit code below to complete your login.`}
					/>

					{error && (
						<>
							<Form.Separator />
							<Form.Description title="" text={`⚠️ ${error}`} />
							<Form.Separator />
						</>
					)}

					<Form.TextField
						id="verificationCode"
						title="Verification Code"
						value={verificationCode}
						onChange={setVerificationCode}
						info="Enter the 6-digit code from your email or SMS"
					/>
				</>
			)}
		</Form>
	);
};

export default Login;
