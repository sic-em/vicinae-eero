import {
	Detail,
	ActionPanel,
	Action,
	showToast,
	Toast,
	Icon,
	Color,
	Alert,
	confirmAlert,
} from "@vicinae/api";
import { Eero, extractEeroID, EeroAPI } from "./api";
import { getConfig } from "./utils";

interface EeroDetailProps {
	eero: Eero;
	onRefresh: () => void;
}

const EeroDetail = ({ eero, onRefresh }: EeroDetailProps) => {
	const eeroId = extractEeroID(eero.url);

	/**
	 * Handle reboot eero node action with confirmation
	 */
	const handleReboot = async (): Promise<void> => {
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

			const api = new EeroAPI(config.token);
			await api.rebootEero(eeroId);

			await showToast({
				style: Toast.Style.Success,
				title: "Rebooting eero",
				message: `${eero.location} is restarting`,
			});

			onRefresh();
		} catch (error: any) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Reboot failed",
				message: error.message,
			});
		}
	};

	/**
	 * Get status color based on eero heartbeat
	 */
	const getStatusColor = (): Color => {
		if (!eero.heartbeat_ok) {
			return Color.Red;
		}

		return Color.Green;
	};

	/**
	 * Get status icon based on eero heartbeat
	 */
	const getStatusIcon = (): Icon => {
		if (!eero.heartbeat_ok) {
			return Icon.XMarkCircle;
		}

		return Icon.CheckCircle;
	};

	return (
		<Detail
			markdown={`# ${eero.location || "Unnamed Eero"}`}
			metadata={
				<Detail.Metadata>
					<Detail.Metadata.Label
						title="Status"
						text={eero.state}
						icon={{ source: getStatusIcon(), tintColor: getStatusColor() }}
					/>

					{eero.gateway && (
						<Detail.Metadata.Label
							title="Role"
							text="Gateway"
							icon={{ source: Icon.Network, tintColor: Color.Blue }}
						/>
					)}

					<Detail.Metadata.Separator />

					<Detail.Metadata.Label title="IP Address" text={eero.ip_address} />
					<Detail.Metadata.Label title="Serial" text={eero.serial} />

					<Detail.Metadata.Separator />

					<Detail.Metadata.Label
						title="Model"
						text={eero.model}
						icon={Icon.Wifi}
					/>
					<Detail.Metadata.Label title="Firmware" text={eero.os_version} />

					<Detail.Metadata.Separator />

					<Detail.Metadata.Label
						title="Connection"
						text={eero.wired ? "Wired" : "Wireless"}
						icon={eero.wired ? Icon.Network : Icon.Wifi}
					/>

					<Detail.Metadata.Label
						title="Signal Quality"
						text={`${eero.mesh_quality_bars}/5 bars`}
					/>

					<Detail.Metadata.Label
						title="Connected Clients"
						text={`${eero.connected_clients_count} devices`}
						icon={Icon.Mobile}
					/>
				</Detail.Metadata>
			}
			actions={
				<ActionPanel>
					<Action
						title="Reboot Node"
						icon={Icon.ArrowClockwise}
						onAction={handleReboot}
						style={Action.Style.Destructive}
						shortcut={{ modifiers: ["cmd"], key: "r" }}
					/>
				</ActionPanel>
			}
		/>
	);
};

export default EeroDetail;
