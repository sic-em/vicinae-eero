import {
	List,
	ActionPanel,
	Action,
	showToast,
	Toast,
	Icon,
	Color,
	Alert,
	confirmAlert,
} from "@vicinae/api";
import { useState, useEffect } from "react";
import { EeroAPI, Eero, extractEeroID } from "./api";
import { getConfig } from "./utils";
import EeroDetail from "./eero-detail";

const Eeros = () => {
	const [eeros, setEeros] = useState<Eero[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string>();

	useEffect(() => {
		loadEeros();
	}, []);

	/**
	 * Load all Eero nodes from the network
	 */
	const loadEeros = async (): Promise<void> => {
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
			const eerosList = await api.getEeros(config.network_id);
			setEeros(eerosList);
		} catch (error: any) {
			setError(error.message || "Failed to load eeros");
			await showToast({
				style: Toast.Style.Failure,
				title: "Failed to load eeros",
				message: error.message,
			});
		} finally {
			setIsLoading(false);
		}
	};

	/**
	 * Handle reboot eero node action
	 */
	const handleReboot = async (eero: Eero): Promise<void> => {
		const confirmed = await confirmAlert({
			title: `Reboot ${eero.location}?`,
			message:
				"This eero node will restart. Devices connected to it may temporarily lose connection.",
			primaryAction: {
				title: "Reboot",
				style: Alert.ActionStyle.Destructive,
			},
		});

		if (!confirmed) {
			return;
		}

		try {
			const config = await getConfig();

			if (!config.token) {
				return;
			}

			const eeroId = extractEeroID(eero.url);
			const api = new EeroAPI(config.token);

			await api.rebootEero(eeroId);

			await showToast({
				style: Toast.Style.Success,
				title: "Rebooting eero",
				message: `${eero.location} is restarting`,
			});

			loadEeros();
		} catch (error: any) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Reboot failed",
				message: error.message,
			});
		}
	};

	/**
	 * Get status icon and color based on eero heartbeat
	 */
	const getStatusIcon = (eero: Eero): { source: Icon; tintColor: Color } => {
		if (!eero.heartbeat_ok) {
			return { source: Icon.XMarkCircle, tintColor: Color.Red };
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

	if (!isLoading && eeros.length === 0) {
		return (
			<List>
				<List.EmptyView
					title="No Eeros Found"
					description="No eero nodes detected on your network"
					icon={Icon.Wifi}
				/>
			</List>
		);
	}

	return (
		<List isLoading={isLoading} searchBarPlaceholder="Search eero nodes...">
			<List.Section title={`${eeros.length} eero nodes`}>
				{eeros.map((eero) => {
					const eeroId = extractEeroID(eero.url);
					const signalBars =
						"●".repeat(eero.mesh_quality_bars) +
						"○".repeat(5 - eero.mesh_quality_bars);

					const accessories = [
						{ text: eero.state },
						...(eero.gateway ? [{ text: "Gateway", icon: Icon.Network }] : []),
						{ text: `${eero.connected_clients_count} clients` },
					];

					return (
						<List.Item
							key={eeroId}
							title={eero.location || "Unnamed"}
							subtitle={eero.model}
							icon={getStatusIcon(eero)}
							accessories={accessories}
							actions={
								<ActionPanel>
									<Action.Push
										title="Show Details"
										icon={Icon.Eye}
										target={<EeroDetail eero={eero} onRefresh={loadEeros} />}
									/>
									<Action
										title="Reboot Node"
										icon={Icon.ArrowClockwise}
										onAction={() => handleReboot(eero)}
										style={Action.Style.Destructive}
										shortcut={{ modifiers: ["cmd"], key: "r" }}
									/>
									<Action
										title="Refresh"
										icon={Icon.ArrowClockwise}
										onAction={loadEeros}
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

export default Eeros;
