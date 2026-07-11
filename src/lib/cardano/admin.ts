import { deserializeAddress } from '@meshsdk/core';

const admin_wallet_address = 'addr1qxw9hkyuacapzjeqdzp0nsjd65lrar5w5slzp7f2f2y9j5s6qsdzes6k3gvy76js3rddqaawrlnazp28v7e8q6tl9pqq8tmzzt';
const { pubKeyHash } = deserializeAddress(admin_wallet_address);
console.log(pubKeyHash);

// run this script to get the pubKeyHash of the admin wallet
// npx tsx admin.ts