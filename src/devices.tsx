import {
	List,
	ActionPanel,
	Action,
	showToast,
	Toast,
	Icon,
	Color,
	Form,
	popToRoot,
} from "@vicinae/api";
import { useState, useEffect } from "react";
import {
	EeroAPI,
	Device,
	getDeviceDisplayName,
	getDeviceDisplayIP,
	extractDeviceID,
} from "./api";
import { getConfig } from "./utils";
import DeviceDetail from "./device-detail";

const Devices = () => {
	const [devices, setDevices] = useState<Device[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string>();
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [connectionFilter, setConnectionFilter] = useState<string>("all");
	const [typeFilter, setTypeFilter] = useState<string>("all");

	useEffect(() => {
		loadDevices();
	}, []);

	/**
	 * Load all devices from the network
	 */
	const loadDevices = async (): Promise<void> => {
		setIsLoading(true);
		setError(undefined);

		try {
			const config = await getConfig();

			if (!config.token || !config.network_id) {
				setError("Not authenticated. Please login first.");
				setIsLoading(false);
				return;
			}

			const api = new EeroAPI(config.token);
			const devicesList = await api.getDevices(config.network_id);
			setDevices(devicesList);
		} catch (error: any) {
			setError(error.message || "Failed to load devices");
			await showToast({
				style: Toast.Style.Failure,
				title: "Failed to load devices",
				message: error.message,
			});
		} finally {
			setIsLoading(false);
		}
	};

	/**
	 * Handle pause/unpause device action
	 */
	const handlePause = async (
		device: Device,
		paused: boolean,
	): Promise<void> => {
		try {
			const config = await getConfig();

			if (!config.token || !config.network_id) {
				return;
			}

			const api = new EeroAPI(config.token);
			const deviceId = extractDeviceID(device.url);

			await api.pauseDevice(config.network_id, deviceId, paused);

			await showToast({
				style: Toast.Style.Success,
				title: paused ? "Device paused" : "Device unpaused",
			});

			loadDevices();
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
	const handleBlock = async (
		device: Device,
		blocked: boolean,
	): Promise<void> => {
		try {
			const config = await getConfig();

			if (!config.token || !config.network_id) {
				return;
			}

			const api = new EeroAPI(config.token);
			const deviceId = extractDeviceID(device.url);

			await api.blockDevice(config.network_id, deviceId, blocked);

			await showToast({
				style: Toast.Style.Success,
				title: blocked ? "Device blocked" : "Device unblocked",
			});

			loadDevices();
		} catch (error: any) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Action failed",
				message: error.message,
			});
		}
	};

	/**
	 * Get status icon and color based on device state
	 */
	const getStatusIcon = (
		device: Device,
	): { source: Icon; tintColor: Color } => {
		if (device.blocked) {
			return { source: Icon.XMarkCircle, tintColor: Color.Red };
		}

		if (device.paused) {
			return { source: Icon.Pause, tintColor: Color.Orange };
		}

		if (device.connected) {
			return { source: Icon.CheckCircle, tintColor: Color.Green };
		}

		return { source: Icon.Circle, tintColor: Color.SecondaryText };
	};

	/**
	 * Get accessory text based on device state
	 */
	const getAccessoryText = (device: Device): string => {
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
	 * Filter devices based on selected filters
	 */
	const filteredDevices = devices.filter((device) => {
		if (statusFilter === "online" && !device.connected) {
			return false;
		}

		if (statusFilter === "offline" && device.connected) {
			return false;
		}

		if (statusFilter === "paused" && !device.paused) {
			return false;
		}

		if (statusFilter === "blocked" && !device.blocked) {
			return false;
		}

		if (connectionFilter === "wireless" && !device.wireless) {
			return false;
		}

		if (connectionFilter === "wired" && device.wireless) {
			return false;
		}

		if (typeFilter === "guest" && !device.is_guest) {
			return false;
		}

		if (typeFilter === "private" && !device.is_private) {
			return false;
		}

		return true;
	});

	if (error) {
		return (
			<List>
				<List.EmptyView
					title="Error"
					description={error}
					icon={Icon.XMarkCircle}
				/>
			</List>
		);
	}

	return (
		<List
			isLoading={isLoading}
			searchBarPlaceholder="Search devices..."
			searchBarAccessory={
				<List.Dropdown
					tooltip="Filter by status"
					value={statusFilter}
					onChange={setStatusFilter}
				>
					<List.Dropdown.Item title="All Devices" value="all" />
					<List.Dropdown.Item title="Online" value="online" />
					<List.Dropdown.Item title="Offline" value="offline" />
					<List.Dropdown.Item title="Paused" value="paused" />
					<List.Dropdown.Item title="Blocked" value="blocked" />
				</List.Dropdown>
			}
		>
			<List.Section title={`${filteredDevices.length} devices`}>
				{filteredDevices.map((device) => {
					const deviceId = extractDeviceID(device.url);
					const displayName = getDeviceDisplayName(device);
					const displayIP = getDeviceDisplayIP(device);

					return (
						<List.Item
							key={deviceId}
							title={displayName}
							subtitle={displayIP}
							icon={getStatusIcon(device)}
							accessories={[{ text: getAccessoryText(device) }].filter(Boolean)}
							actions={
								<ActionPanel>
									<Action.Push
										title="Show Details"
										icon={Icon.Eye}
										target={
											<DeviceDetail device={device} onRefresh={loadDevices} />
										}
									/>
									{device.connected && !device.blocked && (
										<Action
											title={device.paused ? "Unpause" : "Pause"}
											icon={device.paused ? Icon.Play : Icon.Pause}
											onAction={() => handlePause(device, !device.paused)}
											shortcut={{ modifiers: ["cmd"], key: "p" }}
										/>
									)}
									<Action
										title={device.blocked ? "Unblock" : "Block"}
										icon={device.blocked ? Icon.CheckCircle : Icon.XMarkCircle}
										onAction={() => handleBlock(device, !device.blocked)}
										shortcut={{ modifiers: ["cmd"], key: "b" }}
										style={
											device.blocked
												? Action.Style.Regular
												: Action.Style.Destructive
										}
									/>
									<Action.Push
										title="Rename Device"
										icon={Icon.Pencil}
										target={
											<RenameDevice device={device} onComplete={loadDevices} />
										}
										shortcut={{ modifiers: ["cmd"], key: "r" }}
									/>
									<Action
										title="Refresh"
										icon={Icon.ArrowClockwise}
										onAction={loadDevices}
										shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
									/>
								</ActionPanel>
							}
						/>
					);
				})}
			</List.Section>
		</List>
	);
};

export default Devices;

interface RenameDeviceProps {
	device: Device;
	onComplete: () => void;
}

const RenameDevice = ({ device, onComplete }: RenameDeviceProps) => {
	const [nickname, setNickname] = useState(device.nickname || "");
	const [isSubmitting, setIsSubmitting] = useState(false);

	/**
	 * Handle form submission to rename device
	 */
	const handleSubmit = async (): Promise<void> => {
		if (!nickname.trim()) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Nickname required",
				message: "Please enter a nickname",
			});
			return;
		}

		setIsSubmitting(true);

		try {
			const config = await getConfig();

			if (!config.token || !config.network_id) {
				return;
			}

			const api = new EeroAPI(config.token);
			const deviceId = extractDeviceID(device.url);

			await api.renameDevice(config.network_id, deviceId, nickname);

			await showToast({
				style: Toast.Style.Success,
				title: "Device renamed",
				message: `Renamed to "${nickname}"`,
			});

			onComplete();
			popToRoot();
		} catch (error: any) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Rename failed",
				message: error.message,
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Form
			actions={
				<ActionPanel>
					<Action.SubmitForm
						title="Rename Device"
						icon={Icon.Pencil}
						onSubmit={handleSubmit}
					/>
				</ActionPanel>
			}
		>
			<Form.Description
				title="Rename Device"
				text={`Set a custom nickname for ${getDeviceDisplayName(device)}`}
			/>
			<Form.TextField
				id="nickname"
				title="Nickname"
				value={nickname}
				onChange={setNickname}
			/>
			<Form.Description text={`MAC: ${device.mac}`} />
		</Form>
	);
};
