import { deserializeAddress } from '@meshsdk/core';

const admin_wallet_address = 'addr_test1qpv52ffsjr326lhr3g2fns8cdml296tlnz6x44wjy9x32k9vrykyqx43yqjxhznf0acynm4hx0zdperl04xp370r3wusceckvh';
const { pubKeyHash } = deserializeAddress(admin_wallet_address);
console.log(pubKeyHash);

// run this script to get the pubKeyHash of the admin wallet
// npx tsx admin.ts