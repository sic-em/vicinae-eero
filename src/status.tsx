import {
	Action,
	ActionPanel,
	Detail,
	showToast,
	Toast,
	open,
	Icon,
	Color,
} from "@vicinae/api";
import { useEffect, useState } from "react";
import { getAuthStatus, logout, getConfigPath } from "./utils";

interface AuthStatus {
	authenticated: boolean;
	networkName?: string;
	token?: string;
	networkId?: string;
}

const Status = () => {
	const [isLoading, setIsLoading] = useState(true);
	const [authStatus, setAuthStatus] = useState<AuthStatus>();

	useEffect(() => {
		checkStatus();
	}, []);

	/**
	 * Check authentication status
	 */
	const checkStatus = async (): Promise<void> => {
		setIsLoading(true);
		const status = await getAuthStatus();
		setAuthStatus(status);
		setIsLoading(false);
	};

	/**
	 * Handle logout action
	 */
	const handleLogout = async (): Promise<void> => {
		try {
			await showToast({
				style: Toast.Style.Animated,
				title: "Logging out...",
			});

			await logout();

			await showToast({
				style: Toast.Style.Success,
				title: "Logged out successfully",
			});

			const status = await getAuthStatus();
			setAuthStatus(status);
		} catch (error: any) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Logout failed",
				message: error.message,
			});
		}
	};

	const leftContent = "";

	const maskedToken = authStatus?.token
		? `${authStatus.token.slice(0, 10)}…${authStatus.token.slice(-6)}`
		: null;

	return (
		<Detail
			markdown={leftContent}
			metadata={
				authStatus?.authenticated ? (
					<Detail.Metadata>
						<Detail.Metadata.Label
							title="Status"
							text="Connected"
							icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
						/>
						{authStatus.networkName && (
							<Detail.Metadata.Label
								title="Network"
								text={authStatus.networkName}
								icon={Icon.Wifi}
							/>
						)}
						{authStatus.networkId && (
							<Detail.Metadata.Label
								title="Network ID"
								text={authStatus.networkId}
							/>
						)}
						{maskedToken && (
							<Detail.Metadata.Label title="Token" text={maskedToken} />
						)}
						<Detail.Metadata.Separator />
						<Detail.Metadata.Label title="Config" text={getConfigPath()} />
					</Detail.Metadata>
				) : (
					<Detail.Metadata>
						<Detail.Metadata.Label
							title="Status"
							text="Not Connected"
							icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
						/>
						<Detail.Metadata.Separator />
						<Detail.Metadata.Label title="Config" text={getConfigPath()} />
					</Detail.Metadata>
				)
			}
			actions={
				<ActionPanel>
					{authStatus?.authenticated ? (
						<Action
							title="Logout"
							icon={Icon.Logout}
							onAction={handleLogout}
							shortcut={{ modifiers: ["cmd"], key: "l" }}
						/>
					) : (
						<Action
							title="Go to Login"
							icon={Icon.Key}
							onAction={() => open("vicinae://extensions/sic-em/eero/login")}
						/>
					)}
				</ActionPanel>
			}
		/>
	);
};

export default Status;
