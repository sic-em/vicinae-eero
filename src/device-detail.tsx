import {
	Detail,
	ActionPanel,
	Action,
	showToast,
	Toast,
	Icon,
	Color,
} from "@vicinae/api";
import {
	Device,
	extractDeviceID,
	getDeviceDisplayName,
	getDeviceDisplayIP,
	EeroAPI,
} from "./api";
import { getConfig } from "./utils";

interface DeviceDetailProps {
	device: Device;
	onRefresh: () => void;
}

const DeviceDetail = ({ device, onRefresh }: DeviceDetailProps) => {
	const deviceId = extractDeviceID(device.url);
	const displayName = getDeviceDisplayName(device);
	const displayIP = getDeviceDisplayIP(device);

	/**
	 * Handle pause/unpause device action
	 */
	const handlePause = async (paused: boolean): Promise<void> => {
		try {
			const config = await getConfig();

			if (!config.token || !config.network_id) {
				return;
			}

			const api = new EeroAPI(config.token);
			await api.pauseDevice(config.network_id, deviceId, paused);

			await showToast({
				style: Toast.Style.Success,
				title: paused ? "Device paused" : "Device unpaused",
			});

			onRefresh();
		} catch (error: any) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Action failed",
				message: error.message,
			});
		}
	};

	/**
	 * Handle block/unblock device action
	 */
	const handleBlock = async (blocked: boolean): Promise<void> => {
		try {
			const config = await getConfig();

			if (!config.token || !config.network_id) {
				return;
			}

			const api = new EeroAPI(config.token);
			await api.blockDevice(config.network_id, deviceId, blocked);

			await showToast({
				style: Toast.Style.Success,
				title: blocked ? "Device blocked" : "Device unblocked",
			});

			onRefresh();
		} catch (error: any) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Action failed",
				message: error.message,
			});
		}
	};

	/**
	 * Get status color based on device state
	 */
	const getStatusColor = (): Color => {
		if (device.blocked) {
			return Color.Red;
		}

		if (device.paused) {
			return Color.Orange;
		}

		if (device.connected) {
			return Color.Green;
		}

		return Color.SecondaryText;
	};

	/**
	 * Get status text based on device state
	 */
	const getStatusText = (): string => {
		if (device.blocked) {
			return "Blocked";
		}

		if (device.paused) {
			return "Paused";
		}

		if (device.connected) {
			return "Online";
		}

		return "Offline";
	};

	/**
	 * Get status icon based on device state
	 */
	const getStatusIcon = (): Icon => {
		if (device.blocked) {
			return Icon.XMarkCircle;
		}

		if (device.paused) {
			return Icon.Pause;
		}

		if (device.connected) {
			return Icon.CheckCircle;
		}

		return Icon.Circle;
	};

	return (
		<Detail
			markdown={`# ${displayName}`}
			metadata={
				<Detail.Metadata>
					<Detail.Metadata.Label
						title="Status"
						text={getStatusText()}
						icon={{ source: getStatusIcon(), tintColor: getStatusColor() }}
					/>

					<Detail.Metadata.Label title="IP" text={displayIP} />
					<Detail.Metadata.Label title="MAC" text={device.mac} />

					<Detail.Metadata.Separator />

					<Detail.Metadata.Label
						title="Connection"
						text={`${device.wireless ? "Wireless" : "Wired"}${device.is_private ? " • Private" : ""}`}
						icon={device.wireless ? Icon.Wifi : Icon.Network}
					/>

					{device.profile && (
						<Detail.Metadata.Label
							title="Profile"
							text={device.profile.name}
							icon={Icon.TwoPeople}
						/>
					)}

					{device.is_guest && (
						<Detail.Metadata.Label
							title="Network"
							text="Guest"
							icon={{ source: Icon.Globe01, tintColor: Color.Blue }}
						/>
					)}
				</Detail.Metadata>
			}
			actions={
				<ActionPanel>
					{device.connected && !device.blocked && (
						<Action
							title={device.paused ? "Unpause" : "Pause"}
							icon={device.paused ? Icon.Play : Icon.Pause}
							onAction={() => handlePause(!device.paused)}
							shortcut={{ modifiers: ["cmd"], key: "p" }}
						/>
					)}
					<Action
						title={device.blocked ? "Unblock" : "Block"}
						icon={device.blocked ? Icon.CheckCircle : Icon.XMarkCircle}
						onAction={() => handleBlock(!device.blocked)}
						shortcut={{ modifiers: ["cmd"], key: "b" }}
						style={
							device.blocked ? Action.Style.Regular : Action.Style.Destructive
						}
					/>
					<Action
						title="Refresh"
						icon={Icon.ArrowClockwise}
						onAction={onRefresh}
						shortcut={{ modifiers: ["cmd"], key: "r" }}
					/>
				</ActionPanel>
			}
		/>
	);
};

export default DeviceDetail;
