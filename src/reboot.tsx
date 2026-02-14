import {
	Detail,
	ActionPanel,
	Action,
	showToast,
	Toast,
	Icon,
	Alert,
	confirmAlert,
	popToRoot,
} from "@vicinae/api";
import { EeroAPI } from "./api";
import { getConfig } from "./utils";

const Reboot = () => {
	const handleReboot = async (): Promise<void> => {
		const confirmed = await confirmAlert({
			title: "Reboot Network?",
			message:
				"This will reboot your entire Eero network. All devices will temporarily lose internet connection for a few minutes.",
			primaryAction: {
				title: "Reboot Network",
				style: Alert.ActionStyle.Destructive,
			},
		});

		if (!confirmed) {
			return;
		}

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

			await showToast({
				style: Toast.Style.Animated,
				title: "Rebooting network...",
			});

			const api = new EeroAPI(config.token);
			await api.rebootNetwork(config.network_id);

			await showToast({
				style: Toast.Style.Success,
				title: "Network reboot initiated",
				message: "Devices will reconnect automatically in a few minutes",
			});

			popToRoot();
		} catch (error: any) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Reboot failed",
				message: error.message,
			});
		}
	};

	const markdown = `Restart your entire Eero network.

All devices will temporarily disconnect for 2-3 minutes.`;

	return (
		<Detail
			markdown={markdown}
			actions={
				<ActionPanel>
					<Action
						title="Reboot Network"
						icon={Icon.ArrowClockwise}
						onAction={handleReboot}
						style={Action.Style.Destructive}
					/>
				</ActionPanel>
			}
		/>
	);
};

export default Reboot;
