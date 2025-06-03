const fs = require("fs");
const anchor = require("@project-serum/anchor");
const { PublicKey, Keypair } = require("@solana/web3.js");
const { TOKEN_PROGRAM_ID, getAccount, transfer, createTransferInstruction } = require("@solana/spl-token");

const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID);
const USDC_MINT   = new PublicKey(process.env.USDC_MINT);

// load dev wallet
const devKeypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(process.env.DEV_KEYPAIR)))
);

const provider = new anchor.AnchorProvider(
  new anchor.web3.Connection(process.env.SOLANA_CLUSTER),
  new anchor.Wallet(devKeypair),
  {}
);
anchor.setProvider(provider);
const program = new anchor.Program(
  require("../idl/campaign_manager.json"),
  PROGRAM_ID,
  provider
);

// derive PDAs
function getCampaignPDA(campaignId) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("campaign"), Buffer.from(campaignId.toString())],
    PROGRAM_ID
  );
}
function getVaultPDA(campaignId) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"),    Buffer.from(campaignId.toString())],
    PROGRAM_ID
  );
}

module.exports = {
  async transferToVault(campaignId, amount) {
    const [vaultPubkey, vaultBump] = getVaultPDA(campaignId);
    // fetch dev wallet USDC ATA
    const devUsdcAta = await anchor.utils.token.associatedAddress({
      mint: USDC_MINT,
      owner: devKeypair.publicKey,
    });
    // fetch vault ATA
    const vaultUsdcAta = await anchor.utils.token.associatedAddress({
      mint: USDC_MINT,
      owner: vaultPubkey,
    });

    // create vault ATA if missing
    const vaultAcct = await provider.connection.getAccountInfo(vaultUsdcAta);
    const tx = new anchor.web3.Transaction();
    if (!vaultAcct) {
      tx.add(
        anchor.utils.token.createAssociatedTokenAccountInstruction(
          devKeypair.publicKey,
          vaultUsdcAta,
          vaultPubkey,
          USDC_MINT
        )
      );
    }

    // add transfer instruction
    tx.add(
      createTransferInstruction(
        devUsdcAta,
        vaultUsdcAta,
        devKeypair.publicKey,
        amount,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    await provider.sendAndConfirm(tx, [devKeypair]);
    return { vaultPubkey, vaultBump };
  },

  async initializeCampaignOnChain(campaignId, valuePerUser, targetNumber) {
    const [campaignPda, campaignBump] = getCampaignPDA(campaignId);
    const { vaultPubkey, vaultBump } = await this.transferToVault(
      campaignId,
      valuePerUser * targetNumber
    );

    return program.rpc.initializeCampaign(
      new anchor.BN(campaignId),
      new anchor.BN(valuePerUser),
      new anchor.BN(targetNumber),
      {
        accounts: {
          campaign:         campaignPda,
          authority:        devKeypair.publicKey,
          vaultTokenAccount:vaultPubkey,
          vaultAuthority:   vaultPubkey,
          usdcMint:         USDC_MINT,
          systemProgram:    anchor.web3.SystemProgram.programId,
          tokenProgram:     TOKEN_PROGRAM_ID,
          rent:             anchor.web3.SYSVAR_RENT_PUBKEY,
        },
        signers: [devKeypair],
      }
    );
  },

  async rewardUserOnChain(campaignId, recipientAta) {
    const [campaignPda] = getCampaignPDA(campaignId);
    const [vaultPubkey, vaultBump] = getVaultPDA(campaignId);

    return program.rpc.rewardUser({
      accounts: {
        campaign:             campaignPda,
        vaultTokenAccount:    vaultPubkey,
        vaultAuthority:       vaultPubkey,
        recipientTokenAccount:recipientAta,
        tokenProgram:         TOKEN_PROGRAM_ID,
      },
      signers: [devKeypair],
    });
  },
};
