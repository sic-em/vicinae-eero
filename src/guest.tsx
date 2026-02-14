import {
	Form,
	ActionPanel,
	Action,
	showToast,
	Toast,
	Icon,
	Color,
} from "@vicinae/api";
import { useState, useEffect } from "react";
import { EeroAPI, GuestNetwork } from "./api";
import { getConfig } from "./utils";

const Guest = () => {
	const [guestNetwork, setGuestNetwork] = useState<GuestNetwork>();
	const [isLoading, setIsLoading] = useState(true);
	const [password, setPassword] = useState("");

	useEffect(() => {
		loadGuestNetwork();
	}, []);

	/**
	 * Load guest network settings
	 */
	const loadGuestNetwork = async (): Promise<void> => {
		setIsLoading(true);

		try {
			const config = await getConfig();

			if (!config.token || !config.network_id) {
				await showToast({
					style: Toast.Style.Failure,
					title: "Not authenticated",
					message: "Please login first",
				});
				return;
			}

			const api = new EeroAPI(config.token);
			const guestNetworkData = await api.getGuestNetwork(config.network_id);
			setGuestNetwork(guestNetworkData);
			setPassword(guestNetworkData.password || "");
		} catch (error: any) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Failed to load guest network",
				message: error.message,
			});
		} finally {
			setIsLoading(false);
		}
	};

	/**
	 * Handle toggle guest network on/off
	 */
	const handleToggle = async (): Promise<void> => {
		if (!guestNetwork) {
			return;
		}

		try {
			const config = await getConfig();

			if (!config.token || !config.network_id) {
				return;
			}

			const api = new EeroAPI(config.token);
			await api.enableGuestNetwork(config.network_id, !guestNetwork.enabled);

			await showToast({
				style: Toast.Style.Success,
				title: guestNetwork.enabled
					? "Guest network disabled"
					: "Guest network enabled",
			});

			loadGuestNetwork();
		} catch (error: any) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Action failed",
				message: error.message,
			});
		}
	};

	/**
	 * Handle guest network password change
	 */
	const handlePasswordChange = async (): Promise<void> => {
		if (!password.trim()) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Password required",
				message: "Please enter a password",
			});
			return;
		}

		try {
			const config = await getConfig();

			if (!config.token || !config.network_id) {
				return;
			}

			const api = new EeroAPI(config.token);
			await api.setGuestNetworkPassword(config.network_id, password);

			await showToast({
				style: Toast.Style.Success,
				title: "Password updated",
			});

			loadGuestNetwork();
		} catch (error: any) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Failed to update password",
				message: error.message,
			});
		}
	};

	return (
		<Form
			isLoading={isLoading}
			actions={
				<ActionPanel>
					<Action
						title={
							guestNetwork?.enabled
								? "Disable Guest Network"
								: "Enable Guest Network"
						}
						icon={guestNetwork?.enabled ? Icon.XMarkCircle : Icon.CheckCircle}
						onAction={handleToggle}
						shortcut={{ modifiers: ["cmd"], key: "e" }}
					/>
					{guestNetwork?.enabled && (
						<Action
							title="Update Password"
							icon={Icon.Key}
							onAction={handlePasswordChange}
							shortcut={{ modifiers: ["cmd"], key: "s" }}
						/>
					)}
					<Action
						title="Refresh"
						icon={Icon.ArrowClockwise}
						onAction={loadGuestNetwork}
						shortcut={{ modifiers: ["cmd"], key: "r" }}
					/>
				</ActionPanel>
			}
		>
			<Form.Description
				title="Guest Network"
				text="Manage your guest WiFi network settings."
			/>

			{guestNetwork && (
				<>
					<Form.Description
						title="Status"
						text={guestNetwork.enabled ? "✅ Enabled" : "⚪ Disabled"}
					/>

					{guestNetwork.name && (
						<Form.Description title="Network Name" text={guestNetwork.name} />
					)}

					{guestNetwork.enabled && (
						<>
							<Form.Separator />
							<Form.TextField
								id="password"
								title="Password"
								value={password}
								onChange={setPassword}
							/>
							<Form.Description text="Change the password for your guest network. Guests will need the new password to connect." />
						</>
					)}
				</>
			)}
		</Form>
	);
};

export default Guest;
