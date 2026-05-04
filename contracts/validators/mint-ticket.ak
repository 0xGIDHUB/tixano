use aiken/collection/list
use aiken/collection/dict
use aiken/primitive/bytearray
use cardano/assets.{PolicyId, from_lovelace}
use cardano/transaction.{Transaction}
use types.{MintRedeemer, MintOwnerTicket, MintAttendeeTicket}
use cocktail/vodka_address.{address_pub_key}
use cocktail.{key_signed}
use tixano.{get_event_price, get_token_name}

use mocktail.{ 
  mock_pub_key_address,
  add_extra_signatory,
  mock_pub_key_hash,
  mock_policy_id,
  mocktail_tx, 
  complete,
  tx_out, 
  mint
}

validator mint_ticket(
    _event_uuid: ByteArray, 
    event_name: ByteArray
    ) {
        mint(redeemer: MintRedeemer, policy_id: PolicyId, tx: Transaction) {
            let Transaction { outputs, mint, extra_signatories, .. } = tx
            let token_name = get_token_name(redeemer, event_name)
            
            expect [Pair(asset_name, amount)] = 
                mint
                    |> assets.tokens(policy_id)
                    |> dict.to_pairs()

            when redeemer is {
                MintOwnerTicket {admin_address, owner_address, event_capacity} -> {
                    expect Some(own_output) = list.find(
                        outputs,
                        fn(output) {
                            expect Some(pub_key_hash) = address_pub_key(output.address)
                            pub_key_hash == admin_address
                        }
                    )
                    expect Some(event_price) = get_event_price(event_capacity)
                    let payment_verified = own_output.value == from_lovelace(event_price)
                    
                    let has_correct_name = asset_name == token_name && bytearray.starts_with(asset_name, "TXNE-")
                    let has_correct_value = amount == 1
                    let mint_verified = has_correct_name && has_correct_value

                    let signature_verified = key_signed(extra_signatories, owner_address)

                    payment_verified && mint_verified && signature_verified
                }
                MintAttendeeTicket {attendee_address, event_type, ticket_price} -> {
                    // paid tickets not supported yet, to be updated later
                    if event_type == "paid" {
                        False
                    } else if event_type == "free" {
                        let has_correct_name = bytearray.starts_with(asset_name, prefix: token_name)
                        let has_correct_value = amount == 1
                        let mint_verified = has_correct_name && has_correct_value


                        let signature_verified = key_signed(extra_signatories, attendee_address)
                        
                        mint_verified && signature_verified
                    }
                    else {
                        False
                    }
                }
            }
        }

        else(_) {
            fail
        }

}


// ##############     TESTING THE VALIDATOR       ##################
// For the minting transaction to succeed, the following conditions must be met:
// 1. Minting owner tickets must pay the correct event price to the admin address specified in the redeemer.
// 2. Minting owner tickets must have the correct token name and mint exactly 1 token.
// 3. Minting owner tickets must be signed by the event organizer (owner address) specified in the redeemer.
// 4. Minting attendee tickets must have the correct token name prefix and mint exactly 1 token.
// 5. Minting attendee tickets must be signed by the attendee address specified in the redeemer.
// 6. Paid attendee tickets are not yet supported in this version of the contract.


type TestCaseOwner {
  has_output: Bool,
  has_mint: Bool,
  has_signature: Bool,
  has_correct_mint_name: Bool,
  mints_only_one_token: Bool,
  pays_event_fee_to_admin: Bool,
  pays_correct_amount: Bool,
  is_signed_by_owner: Bool
}

type TestCaseAttendee {
  has_mint: Bool,
  has_signature: Bool,
  has_correct_mint_name: Bool,
  mints_only_one_token: Bool,
  is_signed_by_attendee: Bool
}

fn mock_tx_owner(test_case: TestCaseOwner, token_name: ByteArray, event_price: Option<Int>) -> Transaction {
  let TestCaseOwner {
    has_output,
    has_mint,
    has_signature,
    has_correct_mint_name,
    mints_only_one_token,
    pays_event_fee_to_admin,
    pays_correct_amount,
    is_signed_by_owner
  } = test_case
  
  let quantity = if mints_only_one_token { 1 } else { 2 }
  let token_name = if has_correct_mint_name { token_name } else { "WRONG-NAME" }

  let address = if pays_event_fee_to_admin {
    mock_pub_key_address(0, None)
  } else {
    mock_pub_key_address(1, None)
  }
  let amount = if pays_correct_amount {
    expect Some(price) = event_price
    price
    } else { 
        12345678 
    }

  let signatory = if is_signed_by_owner {
    mock_pub_key_hash(2)
  } else {
    mock_pub_key_hash(3)
  }

  mocktail_tx()
    |> mint(
        has_mint,
        quantity,
        mock_policy_id(0),
        token_name
    )
    |> tx_out(
        has_output,
        address,
        from_lovelace(amount)
    )
    |> complete()
    |> add_extra_signatory(has_signature, signatory)
}

fn mock_tx_attendee(test_case: TestCaseAttendee, token_name: ByteArray) -> Transaction {
  let TestCaseAttendee {
    has_mint,
    has_signature,
    has_correct_mint_name,
    mints_only_one_token,
    is_signed_by_attendee
  } = test_case
  
  let quantity = if mints_only_one_token { 1 } else { 2 }
  let token_name = if has_correct_mint_name { token_name } else { "WRONG-NAME" }

  let signatory = if is_signed_by_attendee {
    mock_pub_key_hash(2)
  } else {
    mock_pub_key_hash(3)
  }

  mocktail_tx()
    |> mint(
        has_mint,
        quantity,
        mock_policy_id(0),
        token_name
    )
    |> complete()
    |> add_extra_signatory(has_signature, signatory)
}

test mint_owner_ticket_success() {
    let event_uuid = "4192baa8-bc64-472a-afd2-7d04dc8c2a6c"
    let event_name = "TestEvent"
    let capacity = 100

    let redeemer = MintOwnerTicket {
        admin_address: mock_pub_key_hash(0),
        owner_address: mock_pub_key_hash(2),
        event_capacity: capacity
    }
    let policy_id = mock_policy_id(0)
    let transaction = mock_tx_owner(
        TestCaseOwner {
            has_output: True,
            has_mint: True,
            has_signature: True,
            has_correct_mint_name: True,
            mints_only_one_token: True,
            pays_event_fee_to_admin: True,
            pays_correct_amount: True,
            is_signed_by_owner: True
        },
        get_token_name(redeemer, event_name),
        get_event_price(capacity)
    )

    mint_ticket.mint(event_uuid, event_name, redeemer, policy_id, transaction)
}

test mint_attendee_ticket_success() {
    let event_uuid = "4192baa8-bc64-472a-afd2-7d04dc8c2a6c"
    let event_name = "TestEvent"

    let redeemer = MintAttendeeTicket {
        attendee_address: mock_pub_key_hash(2),
        event_type: "free",
        ticket_price: None
    }
    let policy_id = mock_policy_id(0)
    let transaction = mock_tx_attendee(
        TestCaseAttendee {
            has_mint: True,
            has_signature: True,
            has_correct_mint_name: True,
            mints_only_one_token: True,
            is_signed_by_attendee: True
        },
        get_token_name(redeemer, event_name)
    )

    mint_ticket.mint(event_uuid, event_name, redeemer, policy_id, transaction)
}


