import {
  Bitski,
  BitskiSDKOptions,
  AuthenticationErrorCode,

} from 'bitski';
import type {
  Actions,
  AddEthereumChainParameter,
  Provider,
} from '@web3-react/types'

import { Connector } from '@web3-react/types'

type BitskiProvider = Provider

function parseChainId(chainId: string | number) {
  return typeof chainId === 'number' ? chainId : Number.parseInt(chainId, chainId.startsWith('0x') ? 16 : 10)
}

/**
 * @param options - Options to pass to `@metamask/detect-provider`
 * @param onError - Handler to report errors thrown from eventListeners.
 */
export interface BitskiConstructorArgs {
  actions: Actions
  options?: BitskiSDKOptions
}

export class BitskiConnect extends Connector {
  /** {@inheritdoc Connector.provider} */
  public provider?: BitskiProvider | any
  private readonly options: BitskiSDKOptions | any
  private eagerConnection?: Promise<void>
  public bitskiWallet: BitskiSDKOptions | undefined

  constructor({ actions, options }: BitskiConstructorArgs) {
    super(actions)
    this.options = options
  }
  public bitski: any


  private async isomorphicInitialize(): Promise<void> {
    if (this.eagerConnection) return

    return (this.eagerConnection = import('bitski').then(async (m) => {

      const { CLIENTID, callBackUrl, network } = this.options
      console.log("options", this.options, { CLIENTID, callBackUrl, network });

      this.bitski = new Bitski(CLIENTID, callBackUrl, ['offline', 'email']);

      this.provider = this.bitski.getProvider()
      console.log(this.provider, "//");

      this.bitski.signIn().then((e: any) => {
        console.log("after signin", { e });
        this.actions.update({ accounts: e.accounts, chainId: parseChainId(this.provider.currentChainId), })
      }).catch((error: any) => {
        if (error.code === AuthenticationErrorCode.UserCancelled) {
          console.log("err", error);
        } else {
          this.provider = undefined
          this.eagerConnection = undefined
          this.actions.resetState()
        }
      })
    }))
  }


  /**
   * Initiates a connection.
   * @param desiredChainIdOrChainParameters - If defined, indicates the desired chain to connect to. If the user is
   * already connected to this chain, no additional steps will be taken. Otherwise, the user will be prompted to switch
   * to the chain, if one of two conditions is met: either they already have it added in their extension, or the
   * argument is of type AddEthereumChainParameter, in which case the user will be prompted to add the chain with the
   * specified parameters first, before being prompted to switch.
   * @param bitskiConfig
   */
  public async activate(desiredChainIdOrChainParameters?: number | AddEthereumChainParameter): Promise<void> {

    this.actions.startActivation()

    return this.isomorphicInitialize()
      .then(async () => {
        this.provider = this.bitski.getProvider()
        if (!this.provider) return
      })
      .catch((error) => {
        throw error
      })
  }

  /** {@inheritdoc Connector.deactivate} */
  public async deactivate(): Promise<void> {
    // we don't unregister the display_uri handler because the walletconnect types/inheritances are really broken.
    // it doesn't matter, anyway, as the connector object is destroyed
    this.bitski?.signOut().then((e: any) => {
      this.provider = undefined
      this.eagerConnection = undefined
      this.actions.resetState()
    })

  }
}
