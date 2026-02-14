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
import { EeroAPI, Profile, extractProfileID } from "./api";
import { getConfig } from "./utils";
import ProfileDetail from "./profile-detail";

const Profiles = () => {
	const [profiles, setProfiles] = useState<Profile[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string>();

	useEffect(() => {
		loadProfiles();
	}, []);

	/**
	 * Load all profiles from the network
	 */
	const loadProfiles = async (): Promise<void> => {
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
			const profilesList = await api.getProfiles(config.network_id);
			setProfiles(profilesList);
		} catch (error: any) {
			setError(error.message || "Failed to load profiles");
			await showToast({
				style: Toast.Style.Failure,
				title: "Failed to load profiles",
				message: error.message,
			});
		} finally {
			setIsLoading(false);
		}
	};

	/**
	 * Handle pause/unpause profile action
	 */
	const handlePause = async (
		profile: Profile,
		paused: boolean,
	): Promise<void> => {
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

			loadProfiles();
		} catch (error: any) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Action failed",
				message: error.message,
			});
		}
	};

	/**
	 * Get status icon and color based on profile state
	 */
	const getStatusIcon = (
		profile: Profile,
	): { source: Icon; tintColor: Color } => {
		if (profile.paused) {
			return { source: Icon.Pause, tintColor: Color.Orange };
		}

		return { source: Icon.CheckCircle, tintColor: Color.Green };
	};

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

	if (!isLoading && profiles.length === 0) {
		return (
			<List>
				<List.EmptyView
					title="No Profiles"
					description="No family profiles configured on your network"
					icon={Icon.TwoPeople}
				/>
			</List>
		);
	}

	return (
		<List isLoading={isLoading} searchBarPlaceholder="Search profiles...">
			<List.Section title={`${profiles.length} profiles`}>
				{profiles.map((profile) => {
					const profileId = extractProfileID(profile.url);

					return (
						<List.Item
							key={profileId}
							title={profile.name}
							icon={getStatusIcon(profile)}
							accessories={[{ text: profile.paused ? "Paused" : "Active" }]}
							actions={
								<ActionPanel>
									<Action.Push
										title="Show Details"
										icon={Icon.Eye}
										target={
											<ProfileDetail
												profile={profile}
												onRefresh={loadProfiles}
											/>
										}
									/>
									<Action
										title={profile.paused ? "Unpause" : "Pause"}
										icon={profile.paused ? Icon.Play : Icon.Pause}
										onAction={() => handlePause(profile, !profile.paused)}
										shortcut={{ modifiers: ["cmd"], key: "p" }}
									/>
									<Action
										title="Refresh"
										icon={Icon.ArrowClockwise}
										onAction={loadProfiles}
										shortcut={{ modifiers: ["cmd"], key: "r" }}
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

export default Profiles;
