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
	popToRoot,
} from "@vicinae/api";
import { useState, useEffect } from "react";
import { EeroAPI, Reservation, extractReservationID } from "./api";
import { getConfig } from "./utils";

const Reservations = () => {
	const [reservations, setReservations] = useState<Reservation[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string>();

	useEffect(() => {
		loadReservations();
	}, []);

	/**
	 * Load all DHCP reservations
	 */
	const loadReservations = async (): Promise<void> => {
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
			const reservationsList = await api.getReservations(config.network_id);
			setReservations(reservationsList);
		} catch (error: any) {
			setError(error.message || "Failed to load reservations");
			await showToast({
				style: Toast.Style.Failure,
				title: "Failed to load reservations",
				message: error.message,
			});
		} finally {
			setIsLoading(false);
		}
	};

	/**
	 * Handle delete reservation
	 */
	const handleDelete = async (reservation: Reservation): Promise<void> => {
		const confirmed = await confirmAlert({
			title: "Delete Reservation?",
			message: `Remove DHCP reservation for ${reservation.mac} → ${reservation.ip}`,
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
			const reservationId = extractReservationID(reservation.url);

			await api.deleteReservation(config.network_id, reservationId);

			await showToast({
				style: Toast.Style.Success,
				title: "Reservation deleted",
			});

			loadReservations();
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

	if (!isLoading && reservations.length === 0) {
		return (
			<List
				actions={
					<ActionPanel>
						<Action.Push
							title="Add Reservation"
							icon={Icon.Plus}
							target={<AddReservation onComplete={loadReservations} />}
						/>
					</ActionPanel>
				}
			>
				<List.EmptyView
					title="No DHCP Reservations"
					description="Reserve IP addresses for specific devices"
					icon={Icon.Network}
					actions={
						<ActionPanel>
							<Action.Push
								title="Add Reservation"
								icon={Icon.Plus}
								target={<AddReservation onComplete={loadReservations} />}
							/>
						</ActionPanel>
					}
				/>
			</List>
		);
	}

	return (
		<List isLoading={isLoading} searchBarPlaceholder="Search reservations...">
			<List.Section title={`${reservations.length} reservations`}>
				{reservations.map((reservation) => {
					const reservationId = extractReservationID(reservation.url);
					const accessories = [
						...(reservation.description
							? [{ text: reservation.description }]
							: []),
					];

					return (
						<List.Item
							key={reservationId}
							title={reservation.ip}
							subtitle={reservation.mac}
							accessories={accessories}
							icon={Icon.Network}
							actions={
								<ActionPanel>
									<Action
										title="Delete Reservation"
										icon={Icon.Trash}
										onAction={() => handleDelete(reservation)}
										style={Action.Style.Destructive}
										shortcut={{ modifiers: ["cmd"], key: "backspace" }}
									/>
									<Action.Push
										title="Add Reservation"
										icon={Icon.Plus}
										target={<AddReservation onComplete={loadReservations} />}
										shortcut={{ modifiers: ["cmd"], key: "n" }}
									/>
									<Action
										title="Refresh"
										icon={Icon.ArrowClockwise}
										onAction={loadReservations}
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

export default Reservations;

interface AddReservationProps {
	onComplete: () => void;
}

const AddReservation = ({ onComplete }: AddReservationProps) => {
	const [mac, setMac] = useState("");
	const [ip, setIp] = useState("");
	const [description, setDescription] = useState("");

	/**
	 * Handle form submission to create reservation
	 */
	const handleSubmit = async (): Promise<void> => {
		if (!mac.trim() || !ip.trim()) {
			await showToast({
				style: Toast.Style.Failure,
				title: "MAC and IP required",
				message: "Please fill in both MAC address and IP address",
			});
			return;
		}

		try {
			const config = await getConfig();

			if (!config.token || !config.network_id) {
				return;
			}

			const api = new EeroAPI(config.token);
			await api.createReservation(config.network_id, ip, mac, description);

			await showToast({
				style: Toast.Style.Success,
				title: "Reservation created",
				message: `${mac} → ${ip}`,
			});

			onComplete();
			popToRoot();
		} catch (error: any) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Failed to create reservation",
				message: error.message,
			});
		}
	};

	return (
		<Form
			actions={
				<ActionPanel>
					<Action.SubmitForm
						title="Create Reservation"
						icon={Icon.Plus}
						onSubmit={handleSubmit}
					/>
				</ActionPanel>
			}
		>
			<Form.Description
				title="Add DHCP Reservation"
				text="Reserve a specific IP address for a device's MAC address."
			/>

			<Form.TextField
				id="mac"
				title="MAC Address"
				value={mac}
				onChange={setMac}
				info="The device's MAC address"
			/>

			<Form.TextField
				id="ip"
				title="IP Address"
				value={ip}
				onChange={setIp}
				info="The IP address to assign"
			/>

			<Form.TextField
				id="description"
				title="Description"
				value={description}
				onChange={setDescription}
			/>
		</Form>
	);
};
