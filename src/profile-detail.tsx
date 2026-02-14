import {
	List,
	ActionPanel,
	Action,
	showToast,
	Toast,
	Icon,
	Color,
} from "@vicinae/api";
import { useState, useEffect } from "react";
import {
	EeroAPI,
	Profile,
	ProfileDetails,
	Device,
	extractProfileID,
	extractDeviceID,
	getDeviceDisplayName,
	getDeviceDisplayIP,
} from "./api";
import { getConfig } from "./utils";

interface ProfileDetailProps {
	profile: Profile;
	onRefresh: () => void;
}

const ProfileDetail = ({ profile, onRefresh }: ProfileDetailProps) => {
	const [details, setDetails] = useState<ProfileDetails>();
	const [devices, setDevices] = useState<Device[]>([]);
	const [allDevices, setAllDevices] = useState<Device[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		loadDetails();
	}, []);

	/**
	 * Load profile details and all devices
	 */
	const loadDetails = async (): Promise<void> => {
		setIsLoading(true);

		try {
			const config = await getConfig();

			if (!config.token || !config.network_id) {
				return;
			}

			const api = new EeroAPI(config.token);
			const profileId = extractProfileID(profile.url);

			const [profileDetails, allDevicesList] = await Promise.all([
				api.getProfileDetails(config.network_id, profileId),
				api.getDevices(config.network_id),
			]);

			setDetails(profileDetails);
			setAllDevices(allDevicesList);

			const profileDeviceUrls = new Set(
				profileDetails.devices.map((d) => d.url),
			);
			const profileDevices = allDevicesList.filter((d) =>
				profileDeviceUrls.has(d.url),
			);
			setDevices(profileDevices);
		} catch (error: any) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Failed to load profile",
				message: error.message,
			});
		} finally {
			setIsLoading(false);
		}
	};

	/**
	 * Handle pause/unpause profile action
	 */
	const handlePause = async (paused: boolean): Promise<void> => {
		try {
			const config = await getConfig();

			if (!config.token || !config.network_id) {
				return;
			}

			const api = new EeroAPI(config.token);
			const profileId = extractProfileID(profile.url);

			await api.pauseProfile(config.network_id, profileId, paused);

			await showToast({
				style: Toast.Style.Success,
				title: paused ? "Profile paused" : "Profile unpaused",
			});

			onRefresh();
			loadDetails();
		} catch (error: any) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Action failed",
				message: error.message,
			});
		}
	};

	/**
	 * Handle remove device from profile
	 */
	const handleRemoveDevice = async (device: Device): Promise<void> => {
		try {
			const config = await getConfig();

			if (!config.token || !config.network_id || !details) {
				return;
			}

			const api = new EeroAPI(config.token);
			const profileId = extractProfileID(profile.url);

			const deviceUrls = details.devices
				.filter((d) => d.url !== device.url)
				.map((d) => d.url);

			await api.setProfileDevices(config.network_id, profileId, deviceUrls);

			await showToast({
				style: Toast.Style.Success,
				title: "Device removed",
				message: `${getDeviceDisplayName(device)} removed from ${profile.name}`,
			});

			loadDetails();
		} catch (error: any) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Failed to remove device",
				message: error.message,
			});
		}
	};

	/**
	 * Handle add device to profile
	 */
	const handleAddDevice = async (device: Device): Promise<void> => {
		try {
			const config = await getConfig();

			if (!config.token || !config.network_id || !details) {
				return;
			}

			const api = new EeroAPI(config.token);
			const profileId = extractProfileID(profile.url);

			const deviceUrls = [...details.devices.map((d) => d.url), device.url];

			await api.setProfileDevices(config.network_id, profileId, deviceUrls);

			await showToast({
				style: Toast.Style.Success,
				title: "Device added",
				message: `${getDeviceDisplayName(device)} added to ${profile.name}`,
			});

			loadDetails();
		} catch (error: any) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Failed to add device",
				message: error.message,
			});
		}
	};

	const availableDevices = allDevices.filter(
		(d) => !devices.some((pd) => pd.url === d.url) && !d.is_guest,
	);

	return (
		<List
			isLoading={isLoading}
			searchBarPlaceholder="Search devices..."
			navigationTitle={profile.name}
		>
			<List.Section
				title="Profile Devices"
				subtitle={`${devices.length} devices`}
			>
				{devices.map((device) => {
					const deviceId = extractDeviceID(device.url);
					const displayName = getDeviceDisplayName(device);
					const displayIP = getDeviceDisplayIP(device);

					return (
						<List.Item
							key={deviceId}
							title={displayName}
							subtitle={displayIP}
							icon={
								device.connected
									? { source: Icon.CheckCircle, tintColor: Color.Green }
									: { source: Icon.Circle, tintColor: Color.SecondaryText }
							}
							accessories={[{ text: device.connected ? "Online" : "Offline" }]}
							actions={
								<ActionPanel>
									<Action
										title="Remove from Profile"
										icon={Icon.Trash}
										onAction={() => handleRemoveDevice(device)}
										style={Action.Style.Destructive}
									/>
								</ActionPanel>
							}
						/>
					);
				})}
			</List.Section>

			{availableDevices.length > 0 && (
				<List.Section
					title="Available Devices"
					subtitle={`${availableDevices.length} devices`}
				>
					{availableDevices.map((device) => {
						const deviceId = extractDeviceID(device.url);
						const displayName = getDeviceDisplayName(device);
						const displayIP = getDeviceDisplayIP(device);

						return (
							<List.Item
								key={deviceId}
								title={displayName}
								subtitle={displayIP}
								icon={Icon.Plus}
								actions={
									<ActionPanel>
										<Action
											title="Add to Profile"
											icon={Icon.Plus}
											onAction={() => handleAddDevice(device)}
										/>
									</ActionPanel>
								}
							/>
						);
					})}
				</List.Section>
			)}

			<List.Section title="Actions">
				<List.Item
					title={profile.paused ? "Unpause Profile" : "Pause Profile"}
					icon={profile.paused ? Icon.Play : Icon.Pause}
					actions={
						<ActionPanel>
							<Action
								title={profile.paused ? "Unpause Profile" : "Pause Profile"}
								icon={profile.paused ? Icon.Play : Icon.Pause}
								onAction={() => handlePause(!profile.paused)}
							/>
						</ActionPanel>
					}
				/>
			</List.Section>
		</List>
	);
};

export default ProfileDetail;
