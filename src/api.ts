const BASE_URL = "https://api-user.e2ro.com";
const USER_AGENT = "eero-ios/2.16.0 (iPhone8,1; iOS 11.3)";

/**
 * Standard API response wrapper
 */
export interface APIResponse<T> {
  meta: {
    code: number;
    server_id: string;
    timestamp: number;
  };
  data: T;
}

/**
 * Login response containing user token
 */
export interface LoginResponse {
  user_token: string;
}

/**
 * Network information
 */
export interface Network {
  url: string;
  name: string;
  created: string;
}

/**
 * Account information with networks and premium status
 */
export interface Account {
  name: string;
  email: {
    value: string;
    verified: boolean;
  };
  phone: {
    value: string;
    verified: boolean;
  };
  networks: {
    count: number;
    data: Network[];
  };
  premium_status: string;
}

/**
 * Device connected to the network
 */
export interface Device {
  url: string;
  mac: string;
  hostname: string;
  nickname: string;
  ip: string;
  ipv6_addresses?: Array<{
    address: string;
    scope: string;
  }>;
  connected: boolean;
  wireless: boolean;
  paused: boolean;
  blocked: boolean;
  is_guest: boolean;
  is_private: boolean;
  profile?: {
    url: string;
    name: string;
  };
  connection_type: string;
  device_type: string;
}

/**
 * User profile on the network
 */
export interface Profile {
  url: string;
  name: string;
  paused: boolean;
}

/**
 * Detailed profile information including devices
 */
export interface ProfileDetails {
  url: string;
  name: string;
  paused: boolean;
  devices: Array<{
    url: string;
  }>;
}

/**
 * Eero node/router in the mesh network
 */
export interface Eero {
  url: string;
  serial: string;
  location: string;
  gateway: boolean;
  ip_address: string;
  status: string;
  model: string;
  os_version: string;
  wired: boolean;
  state: string;
  mesh_quality_bars: number;
  connected_clients_count: number;
  heartbeat_ok: boolean;
  is_primary_node: boolean;
  connection_type: string;
}

/**
 * Guest network configuration
 */
export interface GuestNetwork {
  enabled: boolean;
  name: string;
  password: string;
}

/**
 * DHCP reservation
 */
export interface Reservation {
  url: string;
  ip: string;
  mac: string;
  description: string;
}

/**
 * Port forwarding rule
 */
export interface PortForward {
  url: string;
  ip: string;
  gateway_port: number;
  client_port: number;
  protocol: string;
  enabled: boolean;
  description?: string;
  reservation?: string;
}

/**
 * Custom error class for Eero API errors
 */
export class EeroAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "EeroAPIError";
  }
}

/**
 * Eero API Client Class
 */
export class EeroAPI {
  private token: string | null = null;

  constructor(token?: string) {
    if (token) {
      this.token = token;
    }
  }

  /**
   * Set authentication token
   */
  public setToken = (token: string): void => {
    this.token = token;
  };

  /**
   * Make HTTP request to Eero API
   */
  private request = async <T>(
    method: string,
    path: string,
    body?: any,
  ): Promise<T> => {
    const headers: Record<string, string> = {
      "User-Agent": USER_AGENT,
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers["Cookie"] = `s=${this.token}`;
    }

    const options: RequestInit = {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) }),
    };

    try {
      const response = await fetch(`${BASE_URL}${path}`, options);
      const data = await response.json();

      if (!response.ok) {
        const errorMessage =
          data?.meta?.error || `API error (status ${response.status})`;
        throw new EeroAPIError(errorMessage, response.status);
      }

      return data;
    } catch (error: any) {
      if (error instanceof EeroAPIError) {
        throw error;
      }
      throw new EeroAPIError(
        error.message || "Network request failed",
        error.statusCode,
      );
    }
  };

  /**
   * Step 1: Initiate login with email or phone number
   */
  public login = async (identity: string): Promise<LoginResponse> => {
    const response = await this.request<APIResponse<LoginResponse>>(
      "POST",
      "/2.2/login",
      { login: identity },
    );
    return response.data;
  };

  /**
   * Step 2: Verify login with code sent to email/phone
   */
  public loginVerify = async (
    userToken: string,
    code: string,
  ): Promise<void> => {
    this.setToken(userToken);
    await this.request("POST", "/2.2/login/verify", { code });
  };

  /**
   * Get account information including networks
   */
  public getAccount = async (): Promise<Account> => {
    const response = await this.request<APIResponse<Account>>(
      "GET",
      "/2.2/account",
    );
    return response.data;
  };

  /**
   * Validate if the current token is valid
   */
  public validateToken = async (): Promise<boolean> => {
    if (!this.token) {
      return false;
    }

    try {
      await this.getAccount();
      return true;
    } catch {
      return false;
    }
  };

  /**
   * Get all devices on the network
   */
  public getDevices = async (networkId: string): Promise<Device[]> => {
    const response = await this.request<APIResponse<Device[]>>(
      "GET",
      `/2.2/networks/${networkId}/devices`,
    );
    return response.data;
  };

  /**
   * Pause or unpause a device
   */
  public pauseDevice = async (
    networkId: string,
    deviceId: string,
    paused: boolean,
  ): Promise<void> => {
    await this.request(
      "PUT",
      `/2.2/networks/${networkId}/devices/${deviceId}`,
      {
        paused,
      },
    );
  };

  /**
   * Block or unblock a device
   */
  public blockDevice = async (
    networkId: string,
    deviceId: string,
    blocked: boolean,
  ): Promise<void> => {
    await this.request(
      "PUT",
      `/2.2/networks/${networkId}/devices/${deviceId}`,
      {
        blocked,
      },
    );
  };

  /**
   * Rename a device
   */
  public renameDevice = async (
    networkId: string,
    deviceId: string,
    nickname: string,
  ): Promise<void> => {
    await this.request(
      "PUT",
      `/2.2/networks/${networkId}/devices/${deviceId}`,
      {
        nickname,
      },
    );
  };

  /**
   * Get all profiles on the network
   */
  public getProfiles = async (networkId: string): Promise<Profile[]> => {
    const response = await this.request<APIResponse<Profile[]>>(
      "GET",
      `/2.2/networks/${networkId}/profiles`,
    );
    return response.data;
  };

  /**
   * Get profile details including devices
   */
  public getProfileDetails = async (
    networkId: string,
    profileId: string,
  ): Promise<ProfileDetails> => {
    const response = await this.request<APIResponse<ProfileDetails>>(
      "GET",
      `/2.2/networks/${networkId}/profiles/${profileId}`,
    );
    return response.data;
  };

  /**
   * Pause or unpause a profile
   */
  public pauseProfile = async (
    networkId: string,
    profileId: string,
    paused: boolean,
  ): Promise<void> => {
    await this.request(
      "PUT",
      `/2.2/networks/${networkId}/profiles/${profileId}`,
      {
        paused,
      },
    );
  };

  /**
   * Set devices for a profile
   */
  public setProfileDevices = async (
    networkId: string,
    profileId: string,
    deviceUrls: string[],
  ): Promise<void> => {
    const devices = deviceUrls.map((url) => ({ url }));
    await this.request(
      "PUT",
      `/2.2/networks/${networkId}/profiles/${profileId}`,
      {
        devices,
      },
    );
  };

  /**
   * Get all eero nodes on the network
   */
  public getEeros = async (networkId: string): Promise<Eero[]> => {
    const response = await this.request<APIResponse<Eero[]>>(
      "GET",
      `/2.2/networks/${networkId}/eeros`,
    );
    return response.data;
  };

  /**
   * Reboot a single eero node
   */
  public rebootEero = async (eeroId: string): Promise<void> => {
    await this.request("POST", `/2.2/eeros/${eeroId}/reboot`);
  };

  /**
   * Get guest network settings
   */
  public getGuestNetwork = async (networkId: string): Promise<GuestNetwork> => {
    const response = await this.request<APIResponse<GuestNetwork>>(
      "GET",
      `/2.2/networks/${networkId}/guestnetwork`,
    );
    return response.data;
  };

  /**
   * Enable or disable guest network
   */
  public enableGuestNetwork = async (
    networkId: string,
    enabled: boolean,
  ): Promise<void> => {
    await this.request("PUT", `/2.2/networks/${networkId}/guestnetwork`, {
      enabled,
    });
  };

  /**
   * Set guest network password
   */
  public setGuestNetworkPassword = async (
    networkId: string,
    password: string,
  ): Promise<void> => {
    await this.request("PUT", `/2.2/networks/${networkId}/guestnetwork`, {
      password,
    });
  };

  /**
   * Reboot the entire network
   */
  public rebootNetwork = async (networkId: string): Promise<void> => {
    await this.request("POST", `/2.2/networks/${networkId}/reboot`);
  };

  /**
   * Get all DHCP reservations
   */
  public getReservations = async (
    networkId: string,
  ): Promise<Reservation[]> => {
    const response = await this.request<APIResponse<Reservation[]>>(
      "GET",
      `/2.2/networks/${networkId}/reservations`,
    );
    return response.data;
  };

  /**
   * Create a DHCP reservation
   */
  public createReservation = async (
    networkId: string,
    ip: string,
    mac: string,
    description: string,
  ): Promise<void> => {
    await this.request("POST", `/2.2/networks/${networkId}/reservations`, {
      ip,
      mac,
      description,
    });
  };

  /**
   * Delete a DHCP reservation
   */
  public deleteReservation = async (
    networkId: string,
    reservationId: string,
  ): Promise<void> => {
    await this.request(
      "DELETE",
      `/2.2/networks/${networkId}/reservations/${reservationId}`,
    );
  };

  /**
   * Get all port forwarding rules
   */
  public getPortForwards = async (
    networkId: string,
  ): Promise<PortForward[]> => {
    const response = await this.request<APIResponse<PortForward[]>>(
      "GET",
      `/2.2/networks/${networkId}/forwards`,
    );
    return response.data;
  };

  /**
   * Create a port forwarding rule
   */
  public createPortForward = async (
    networkId: string,
    ip: string,
    gatewayPort: number,
    clientPort: number,
    protocol: string,
    description?: string,
  ): Promise<void> => {
    await this.request("POST", `/2.2/networks/${networkId}/forwards`, {
      ip,
      gateway_port: gatewayPort,
      client_port: clientPort,
      protocol,
      enabled: true,
      description,
    });
  };

  /**
   * Update a port forwarding rule
   */
  public updatePortForward = async (
    networkId: string,
    forwardId: string,
    updates: Partial<PortForward>,
  ): Promise<void> => {
    await this.request(
      "PUT",
      `/2.2/networks/${networkId}/forwards/${forwardId}`,
      updates,
    );
  };

  /**
   * Delete a port forwarding rule
   */
  public deletePortForward = async (
    networkId: string,
    forwardId: string,
  ): Promise<void> => {
    await this.request(
      "DELETE",
      `/2.2/networks/${networkId}/forwards/${forwardId}`,
    );
  };
}

/**
 * Extract network ID from URL like "/2.2/networks/12345"
 */
export const extractNetworkID = (url: string): string => {
  const prefix = "/2.2/networks/";

  if (!url.startsWith(prefix)) {
    return url;
  }

  return url.substring(prefix.length);
};

/**
 * Extract device ID from URL
 */
export const extractDeviceID = (url: string): string => {
  const marker = "/devices/";
  const index = url.lastIndexOf(marker);

  if (index < 0) {
    return url;
  }

  return url.substring(index + marker.length);
};

/**
 * Extract profile ID from URL
 */
export const extractProfileID = (url: string): string => {
  const marker = "/profiles/";
  const index = url.lastIndexOf(marker);

  if (index < 0) {
    return url;
  }

  return url.substring(index + marker.length);
};

/**
 * Extract eero ID from URL
 */
export const extractEeroID = (url: string): string => {
  const prefix = "/2.2/eeros/";

  if (!url.startsWith(prefix)) {
    return url;
  }

  return url.substring(prefix.length);
};

/**
 * Extract reservation ID from URL
 */
export const extractReservationID = (url: string): string => {
  const marker = "/reservations/";
  const index = url.lastIndexOf(marker);

  if (index < 0) {
    return url;
  }

  return url.substring(index + marker.length);
};

/**
 * Extract port forward ID from URL
 */
export const extractPortForwardID = (url: string): string => {
  const marker = "/forwards/";
  const index = url.lastIndexOf(marker);

  if (index < 0) {
    return url;
  }

  return url.substring(index + marker.length);
};

/**
 * Get display name for a device (nickname > hostname > MAC)
 */
export const getDeviceDisplayName = (device: Device): string => {
  if (device.nickname) {
    return device.nickname;
  }

  if (device.hostname) {
    return device.hostname;
  }

  return device.mac;
};

/**
 * Get display IP for a device (IPv4 preferred)
 */
export const getDeviceDisplayIP = (device: Device): string => {
  if (device.ip) {
    return device.ip;
  }

  if (!device.ipv6_addresses) {
    return "No IP";
  }

  // Try to find a non-link-local IPv6 address
  for (const address of device.ipv6_addresses) {
    if (address.scope !== "link") {
      return address.address.split("/")[0];
    }
  }

  // Fall back to link-local if available
  if (device.ipv6_addresses.length > 0) {
    return device.ipv6_addresses[0].address.split("/")[0];
  }

  return "No IP";
};
