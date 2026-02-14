import {
	List,
	ActionPanel,
	Action,
	showToast,
	Toast,
	Icon,
	Form,
	Alert,
	confirmAlert,
	Color,
	popToRoot,
} from "@vicinae/api";
import { useState, useEffect } from "react";
import { EeroAPI, PortForward, extractPortForwardID } from "./api";
import { getConfig } from "./utils";

const PortForwarding = () => {
	const [forwards, setForwards] = useState<PortForward[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string>();

	useEffect(() => {
		loadForwards();
	}, []);

	/**
	 * Load all port forwarding rules
	 */
	const loadForwards = async (): Promise<void> => {
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
			const forwardsList = await api.getPortForwards(config.network_id);
			setForwards(forwardsList);
		} catch (error: any) {
			setError(error.message || "Failed to load port forwards");
			await showToast({
				style: Toast.Style.Failure,
				title: "Failed to load port forwards",
				message: error.message,
			});
		} finally {
			setIsLoading(false);
		}
	};

	/**
	 * Handle toggle port forward rule on/off
	 */
	const handleToggle = async (forward: PortForward): Promise<void> => {
		try {
			const config = await getConfig();

			if (!config.token || !config.network_id) {
				return;
			}

			const api = new EeroAPI(config.token);
			const forwardId = extractPortForwardID(forward.url);

			await api.updatePortForward(config.network_id, forwardId, {
				ip: forward.ip,
				gateway_port: forward.gateway_port,
				client_port: forward.client_port,
				protocol: forward.protocol,
				enabled: !forward.enabled,
				description: forward.description,
			});

			await showToast({
				style: Toast.Style.Success,
				title: forward.enabled ? "Rule disabled" : "Rule enabled",
			});

			loadForwards();
		} catch (error: any) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Toggle failed",
				message: error.message,
			});
		}
	};

	/**
	 * Handle delete port forward rule with confirmation
	 */
	const handleDelete = async (forward: PortForward): Promise<void> => {
		const portDisplay =
			forward.gateway_port === forward.client_port
				? forward.gateway_port.toString()
				: `${forward.gateway_port} → ${forward.client_port}`;

		const confirmed = await confirmAlert({
			title: "Delete Port Forward?",
			message: `Remove ${forward.protocol.toUpperCase()} port ${portDisplay} → ${forward.ip}`,
			primaryAction: {
				title: "Delete",
				style: Alert.ActionStyle.Destructive,
			},
		});

		if (!confirmed) {
			return;
		}

		try {
			const config = await getConfig();

			if (!config.token || !config.network_id) {
				return;
			}

			const api = new EeroAPI(config.token);
			const forwardId = extractPortForwardID(forward.url);

			await api.deletePortForward(config.network_id, forwardId);

			await showToast({
				style: Toast.Style.Success,
				title: "Port forward deleted",
			});

			loadForwards();
		} catch (error: any) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Delete failed",
				message: error.message,
			});
		}
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

	if (!isLoading && forwards.length === 0) {
		return (
			<List
				actions={
					<ActionPanel>
						<Action.Push
							title="Add Port Forward"
							icon={Icon.Plus}
							target={<AddPortForward onComplete={loadForwards} />}
						/>
					</ActionPanel>
				}
			>
				<List.EmptyView
					title="No Port Forwards"
					description="Create rules to forward external traffic to devices"
					icon={Icon.Network}
					actions={
						<ActionPanel>
							<Action.Push
								title="Add Port Forward"
								icon={Icon.Plus}
								target={<AddPortForward onComplete={loadForwards} />}
							/>
						</ActionPanel>
					}
				/>
			</List>
		);
	}

	return (
		<List isLoading={isLoading} searchBarPlaceholder="Search port forwards...">
			<List.Section title={`${forwards.length} port forwards`}>
				{forwards.map((forward) => {
					const forwardId = extractPortForwardID(forward.url);
					const accessories = [
						{ text: forward.enabled ? "Enabled" : "Disabled" },
						...(forward.description ? [{ text: forward.description }] : []),
					];

					return (
						<List.Item
							key={forwardId}
							title={
								forward.gateway_port === forward.client_port
									? `${forward.protocol.toUpperCase()} ${forward.gateway_port}`
									: `${forward.protocol.toUpperCase()} ${forward.gateway_port} → ${forward.client_port}`
							}
							subtitle={forward.ip}
							icon={{
								source: forward.enabled ? Icon.CheckCircle : Icon.Circle,
								tintColor: forward.enabled ? Color.Green : Color.SecondaryText,
							}}
							accessories={accessories}
							actions={
								<ActionPanel>
									<Action
										title={forward.enabled ? "Disable" : "Enable"}
										icon={forward.enabled ? Icon.XMarkCircle : Icon.CheckCircle}
										onAction={() => handleToggle(forward)}
										shortcut={{ modifiers: ["cmd"], key: "e" }}
									/>
									<Action
										title="Delete"
										icon={Icon.Trash}
										onAction={() => handleDelete(forward)}
										style={Action.Style.Destructive}
										shortcut={{ modifiers: ["cmd"], key: "backspace" }}
									/>
									<Action.Push
										title="Add Port Forward"
										icon={Icon.Plus}
										target={<AddPortForward onComplete={loadForwards} />}
										shortcut={{ modifiers: ["cmd"], key: "n" }}
									/>
									<Action
										title="Refresh"
										icon={Icon.ArrowClockwise}
										onAction={loadForwards}
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

export default PortForwarding;

interface AddPortForwardProps {
	onComplete: () => void;
}

const AddPortForward = ({ onComplete }: AddPortForwardProps) => {
	const [ip, setIp] = useState("");
	const [gatewayPort, setGatewayPort] = useState("");
	const [clientPort, setClientPort] = useState("");
	const [protocol, setProtocol] = useState("tcp");
	const [description, setDescription] = useState("");
	const [samePort, setSamePort] = useState(true);

	/**
	 * Handle form submission to create port forward
	 */
	const handleSubmit = async (): Promise<void> => {
		if (!ip.trim() || !gatewayPort.trim()) {
			await showToast({
				style: Toast.Style.Failure,
				title: "IP and port required",
				message: "Please fill in both IP address and external port",
			});
			return;
		}

		const gateway = parseInt(gatewayPort);
		const client = samePort ? gateway : parseInt(clientPort || gatewayPort);

		if (isNaN(gateway) || isNaN(client)) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Invalid port number",
				message: "Ports must be valid numbers",
			});
			return;
		}

		try {
			const config = await getConfig();

			if (!config.token || !config.network_id) {
				return;
			}

			const api = new EeroAPI(config.token);
			await api.createPortForward(
				config.network_id,
				ip,
				gateway,
				client,
				protocol,
				description || undefined,
			);

			await showToast({
				style: Toast.Style.Success,
				title: "Port forward created",
				message: `${protocol.toUpperCase()} ${gateway} → ${ip}:${client}`,
			});

			onComplete();
			popToRoot();
		} catch (error: any) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Failed to create port forward",
				message: error.message,
			});
		}
	};

	return (
		<Form
			actions={
				<ActionPanel>
					<Action.SubmitForm
						title="Create Port Forward"
						icon={Icon.Plus}
						onSubmit={handleSubmit}
					/>
				</ActionPanel>
			}
		>
			<Form.Description
				title="Add Port Forward"
				text="Forward external traffic to a device on your network."
			/>

			<Form.TextField
				id="ip"
				title="Internal IP"
				value={ip}
				onChange={setIp}
				info="The local IP address to forward to"
			/>

			<Form.TextField
				id="gatewayPort"
				title="External Port"
				value={gatewayPort}
				onChange={setGatewayPort}
				info="The port on your router that receives traffic"
			/>

			<Form.Checkbox
				id="samePort"
				label="Use same port internally"
				value={samePort}
				onChange={setSamePort}
			/>

			{!samePort && (
				<Form.TextField
					id="clientPort"
					title="Internal Port"
					value={clientPort}
					onChange={setClientPort}
					info="Different port on the internal device"
				/>
			)}

			<Form.Dropdown
				id="protocol"
				title="Protocol"
				value={protocol}
				onChange={setProtocol}
			>
				<Form.Dropdown.Item title="TCP" value="tcp" />
				<Form.Dropdown.Item title="UDP" value="udp" />
				<Form.Dropdown.Item title="Both (TCP & UDP)" value="both" />
			</Form.Dropdown>

			<Form.TextField
				id="description"
				title="Description"
				value={description}
				onChange={setDescription}
			/>

			<Form.Description text="Common ports: 80 (HTTP), 443 (HTTPS), 22 (SSH), 3389 (RDP), 25565 (Minecraft)" />
		</Form>
	);
};
