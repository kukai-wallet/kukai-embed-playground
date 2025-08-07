import { BeaconEvent, DAppClient, PartialTezosOperation } from '@airgap/beacon-sdk';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KukaiEmbed, KukaiEmbedError, KukaiEmbedResponseError } from 'kukai-embed';
import './App.css';
import { User } from './modal/types';
import { WalletCommunicator } from './utils/wallet-communicator';
import { PROVIDERS } from './utils/providers';
import { DEFAULT_EXPRESSION, DEFAULT_PAYLOAD, formatAddress } from './utils/text-utils';

enum APP_STATUS {
  LOADING,
  READY
}

const walletCommunicator = new WalletCommunicator();
let attemptedInit = false

export default function App() {
  const [status, setStatus] = useState(APP_STATUS.LOADING);
  const [response, setResponse] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const kukaiEmbedClient = useRef<KukaiEmbed | null>(null);
  const beaconClient = useRef<DAppClient | null>(null);
  const isReady = status === APP_STATUS.READY;
  const displayName = !isReady
    ? '⚪ Loading'
    : user
      ? `🟢 ${user.name || formatAddress(user.address)}`
      : '⚪ No User'

  const setBeaconListener = useCallback(() => {
    beaconClient.current!.subscribeToEvent(BeaconEvent.ACTIVE_ACCOUNT_SET, async (account) => {
      if (!account) {
        setUser(null);
      }
      if (account) {
        setUser({ provider: PROVIDERS.BEACON, address: account.address, name: null })
      }
      console.log(`${BeaconEvent.ACTIVE_ACCOUNT_SET} triggered: `, account)
    })
  }, [])

  useEffect(() => {
    if (status === APP_STATUS.READY || attemptedInit) {
      return;
    }
    attemptedInit = true;

    walletCommunicator.init()
      .then((payload) => {
        setUser(payload.user);
        beaconClient.current = payload.beaconClient;
        kukaiEmbedClient.current = payload.kukaiEmbedClient as unknown as KukaiEmbed;
        setBeaconListener();
        setStatus(APP_STATUS.READY);
      })
      .catch(console.warn)
  }, [status, setBeaconListener])

  async function handleLogout() {
    const { provider } = user!;
    if (provider === PROVIDERS.BEACON) {
      await beaconClient.current?.removeAllAccounts();
    } else {
      await kukaiEmbedClient.current?.logout();
    }
    setUser(null);
    setResponse('');
  }

  async function handleSend() {
    setResponse('');
    try {
      const { provider } = user!;
      const response: any = provider === PROVIDERS.BEACON
        ? await beaconClient.current?.requestOperation({ operationDetails: DEFAULT_PAYLOAD as unknown as PartialTezosOperation[] })
        : await kukaiEmbedClient.current?.send(DEFAULT_PAYLOAD);
      setResponse(response?.transactionHash || response);
    } catch (error) {
      if (error instanceof KukaiEmbedError) {
        console.log('>>', error.errorMessage, error.error, error.errorId);
      }
    }
  }

  async function handleLogin(withParams?: boolean): Promise<PROVIDERS | undefined> {
    try {
      let kukaiEmbedResponse
      try {
        kukaiEmbedResponse = withParams
          ? await kukaiEmbedClient.current?.login({ template: 'objkt', authParams: { id: "my-dapp", nonce: "sample nonce" } })
          : await kukaiEmbedClient.current?.login({ template: 'objkt' });
      } catch (exception) {
        if (!(exception instanceof KukaiEmbedError)) {
          // handle other exceptions
          return;
        }
        if (exception.error === KukaiEmbedResponseError.OTHER_WALLETS) {
          const beaconResponse = await beaconClient.current?.requestPermissions();
          if (!beaconResponse) {
            return;
          }
          setUser({ address: beaconResponse.address, provider: PROVIDERS.BEACON, name: null })
          return PROVIDERS.BEACON;
        }
      }

      if (!kukaiEmbedResponse?.pkh) {
        return;
      }

      setUser({ address: kukaiEmbedResponse.pkh, provider: PROVIDERS.KUKAI_EMBED, name: (kukaiEmbedResponse.userData as unknown as Record<string, string>).name })
      if (withParams) {
        setResponse(kukaiEmbedResponse.authResponse!.signature);
      }
      return PROVIDERS.KUKAI_EMBED;
    } catch (error) {
      console.warn(error);
    }
  }

  async function handleSign() {
    const provider: any = await handleLogin();
    if (!provider) {
      return
    }
    let response;
    if (provider === PROVIDERS.BEACON) {
      response = await beaconClient.current?.requestSignPayload({ payload: DEFAULT_EXPRESSION });
    } else {
      response = await kukaiEmbedClient.current?.signExpr(DEFAULT_EXPRESSION);
    }
    setResponse(response?.signature || response);
  }

  async function handleSignWithParams() {
    const provider: any = await handleLogin(true);
    if (provider !== PROVIDERS.BEACON) {
      return
    }
    const response = await beaconClient.current?.requestSignPayload({ payload: DEFAULT_EXPRESSION });
    setResponse(response?.signature ?? '');
  }

  return (
    <div className="card">
      <div className="header-top">
        <h1>Kukai-embed</h1>
        <div className="user-status">
          <span id="statusInfo">{displayName}</span>
          <button id="btnLogout" onClick={handleLogout} disabled={!user || !isReady}>Logout</button>
        </div>
      </div>

      <div className="social-options">
        <h2>Objkt Simulation</h2>
      </div>

      {response &&
        <div className="body-params">
          <h3>Response</h3>
          <p>{response}</p>
        </div>
      }

      <div className="body-bottom">
        <button id="btnLogin" onClick={() => handleLogin()} disabled={!!user || !isReady}>Login</button>
        <button id="btnAuth" onClick={handleSignWithParams} disabled={!!user || !isReady}>Login + Sign <i>(Params)</i></button>
        <button id="btnAuth" onClick={handleSign} disabled={!!user || !isReady}>Login + Sign <i>(Modal)</i></button>
        <button id="btnAuth" onClick={handleSend} disabled={!user || !isReady}>Send</button>
      </div>
    </div>
  )
}
