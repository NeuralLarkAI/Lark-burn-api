import bs58 from "bs58";

export default async function handler(req, res) {
  try {
    // CORS (important for GitHub Pages → Vercel)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    const mint = req.query.mint;
    if (!mint) {
      return res.status(400).json({ error: "Missing mint" });
    }

    const rpcUrl = process.env.SOLANA_RPC_URL;
    if (!rpcUrl) {
      return res.status(500).json({ error: "Missing SOLANA_RPC_URL" });
    }

    const body = {
      jsonrpc: "2.0",
      id: 1,
      method: "getProgramAccounts",
      params: [
        "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        {
          encoding: "base64",
          filters: [
            { dataSize: 165 },
            { memcmp: { offset: 0, bytes: mint } }
          ]
        }
      ]
    };

    const rpcRes = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const rpcJson = await rpcRes.json();
    const accounts = rpcJson?.result || [];

    const owners = new Set();

    for (const acc of accounts) {
      const data = acc?.account?.data?.[0];
      if (!data) continue;

      const buf = Buffer.from(data, "base64");

      // Owner pubkey = bytes 32–63
      const ownerBytes = buf.slice(32, 64);
      const ownerPubkey = bs58.encode(ownerBytes);

      owners.add(ownerPubkey);
    }

    return res.status(200).json({
      holders: owners.size
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
}
