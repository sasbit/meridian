import 'dotenv/config';

const API_URL = `http://localhost:${process.env.PORT || 3000}`;
const API_KEY = process.argv[2];

if (!API_KEY) {
  console.error('Usage: ts-node scripts/demo.ts <api_key>');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${API_KEY}`,
};

interface AccountResponse {
  id: string;
  deposit_address: string;
  chain: string;
}

interface BalanceResponse {
  available: string;
  currency: string;
}

interface PayoutResponse {
  id: string;
  status: string;
  tx_hash: string | null;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('\n=== Meridian — Stablecoin Business Accounts Demo ===\n');

  console.log('1. Creating account...');
  const accountRes = await fetch(`${API_URL}/v1/accounts`, {
    method: 'POST',
    headers,
  });
  const account = (await accountRes.json()) as AccountResponse;
  console.log(`   Account ID:       ${account.id}`);
  console.log(`   Deposit Address:  ${account.deposit_address}`);
  console.log(`   Chain:            ${account.chain}`);

  console.log('\n2. Checking account balance...');
  const balanceRes = await fetch(`${API_URL}/v1/accounts/balance`, { headers });
  const balance = (await balanceRes.json()) as BalanceResponse;
  console.log(`   Balance:          ${balance.available} ${balance.currency}`);

  console.log('\n3. Creating payout (100 USDC to recipient)...');
  const createRes = await fetch(`${API_URL}/v1/payouts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      amount: '100.00',
      currency: 'USDC',
      network: 'base',
      recipient: {
        type: 'wallet',
        address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    console.log(`   Error: ${JSON.stringify(err)}`);
    console.log(
      '\n   Fund your account by sending USDC to the deposit address above.',
    );
    console.log('\n=== Demo complete ===\n');
    return;
  }

  const payout = (await createRes.json()) as PayoutResponse;
  console.log(`   Payout ID:  ${payout.id}`);
  console.log(`   Status:     ${payout.status}`);

  console.log('\n4. Polling payout status...');
  let status = payout.status;
  while (status !== 'delivered' && status !== 'failed') {
    await sleep(1000);
    const pollRes = await fetch(`${API_URL}/v1/payouts/${payout.id}`, {
      headers,
    });
    const current = (await pollRes.json()) as PayoutResponse;
    if (current.status !== status) {
      status = current.status;
      console.log(`   Status changed → ${status}`);
    }
  }

  console.log('\n5. Final payout state:');
  const finalRes = await fetch(`${API_URL}/v1/payouts/${payout.id}`, {
    headers,
  });
  const result = (await finalRes.json()) as PayoutResponse;
  console.log(JSON.stringify(result, null, 2));

  console.log('\n=== Demo complete ===\n');
}

main().catch((err) => {
  console.error('Demo failed:', err);
  process.exit(1);
});
