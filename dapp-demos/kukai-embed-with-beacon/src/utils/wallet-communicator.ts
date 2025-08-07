
import { DAppClient, NetworkType } from '@airgap/beacon-sdk';
import { KukaiEmbed, Networks } from 'kukai-embed';
import type { User } from '../modal/types';
import { PROVIDERS } from './providers';

export class WalletCommunicator {
    kukaiEmbedClient = new KukaiEmbed({ net: Networks.ghostnet, icon: false });
    beaconClient = new DAppClient({ name: 'My Sample DApp', network: { type: NetworkType.GHOSTNET } });
    user: User | null = null;

    constructor() {
        // no-op
    }

    async init() {
        const [, beaconUser] = await Promise.all([
            this.kukaiEmbedClient.init(),
            await this.beaconClient.getActiveAccount()
        ])

        if (beaconUser) {
            this.user = { provider: PROVIDERS.BEACON, address: beaconUser.address, name: null }
        }

        const kukaiEmbedUser = this.kukaiEmbedClient.user
        if (kukaiEmbedUser) {
            this.user = { provider: PROVIDERS.KUKAI_EMBED, address: kukaiEmbedUser.pkh, name: (kukaiEmbedUser.userData as unknown as Record<string, string>).name }
        }

        return { user: this.user, kukaiEmbedClient: this.kukaiEmbedClient, beaconClient: this.beaconClient }
    }
}