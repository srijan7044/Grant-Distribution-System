// #![cfg(test)]

// use super::*;
// use soroban_sdk::{testutils::Address as _, Address, Env};

// #[test]
// fn lifecycle_create_apply_approve() {
//     let env = Env::default();
//     env.mock_all_auths();

//     let contract_id = env.register(GrantContract, ());
//     let client = GrantContractClient::new(&env, &contract_id);

//     let creator = Address::generate(&env);
//     let applicant = Address::generate(&env);
//     let admin = Address::generate(&env);

//     // assert_eq!(client.create_grant(&creator, &1, &1000), Ok(()));
//     client.create_grant(&creator, &1, &1000);
//     // assert_eq!(client.apply(&applicant, &1), Ok(()));
//     // assert_eq!(client.approve(&admin, &1), Ok(()));
//     client.apply(&applicant, &1);
// client.approve(&admin, &1);

//     let grant = client.get_grant(&1);
//     assert_eq!(grant.id, 1);
//     assert_eq!(grant.creator, creator);
//     assert_eq!(grant.amount, 1000);
//     assert_eq!(grant.recipient, Some(applicant));
//     assert!(grant.approved);
//     assert_eq!(grant.token, None);
//     assert!(!grant.funded);
// }

// #[test]
// fn rejects_duplicate_and_missing_grants() {
//     let env = Env::default();
//     env.mock_all_auths();

//     let contract_id = env.register(GrantContract, ());
//     let client = GrantContractClient::new(&env, &contract_id);

//     let creator = Address::generate(&env);
//     let applicant = Address::generate(&env);

//     assert_eq!(client.create_grant(&creator, &7, &25), Ok(()));
//     assert_eq!(
//         client.create_grant(&creator, &7, &30),
//         Err(Ok(GrantError::GrantExists))
//     );

//     assert_eq!(
//         client.apply(&applicant, &99),
//         Err(Ok(GrantError::GrantNotFound))
//     );
// }

// #[test]
// fn creates_token_grant_metadata() {
//     let env = Env::default();
//     env.mock_all_auths();

//     let contract_id = env.register(GrantContract, ());
//     let client = GrantContractClient::new(&env, &contract_id);

//     let creator = Address::generate(&env);
//     let token_contract = Address::generate(&env);

//     assert_eq!(
//         client.create_token_grant(&creator, &42, &token_contract, &555),
//         Ok(())
//     );

//     let grant = client.get_grant(&42).unwrap();
//     assert_eq!(grant.id, 42);
//     assert_eq!(grant.amount, 555);
//     assert_eq!(grant.token, Some(token_contract));
//     assert!(!grant.funded);
// }


#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn lifecycle_create_apply_approve() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(GrantContract, ());
    let client = GrantContractClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let applicant = Address::generate(&env);
    let admin = Address::generate(&env);

    client.create_grant(&creator, &1, &1000);
    client.apply(&applicant, &1);
    client.approve(&admin, &1);

    let grant = client.get_grant(&1);

    assert_eq!(grant.id, 1);
    assert_eq!(grant.creator, creator);
    assert_eq!(grant.amount, 1000);
    assert_eq!(grant.recipient, Some(applicant));
    assert!(grant.approved);
    assert_eq!(grant.token, None);
    assert!(!grant.funded);
}

#[test]
#[should_panic]
fn rejects_duplicate_grants() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(GrantContract, ());
    let client = GrantContractClient::new(&env, &contract_id);

    let creator = Address::generate(&env);

    // First creation works
    client.create_grant(&creator, &7, &25);
    // Duplicate create should panic via generated non-try client.
    client.create_grant(&creator, &7, &30);
}

#[test]
#[should_panic]
fn rejects_missing_grants_on_apply() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(GrantContract, ());
    let client = GrantContractClient::new(&env, &contract_id);

    let applicant = Address::generate(&env);

    // Applying to a missing grant should panic via generated non-try client.
    client.apply(&applicant, &99);
}

#[test]
fn creates_token_grant_metadata() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(GrantContract, ());
    let client = GrantContractClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let token_contract = Address::generate(&env);

    client.create_token_grant(&creator, &42, &token_contract, &555);

    let grant = client.get_grant(&42);

    assert_eq!(grant.id, 42);
    assert_eq!(grant.amount, 555);
    assert_eq!(grant.token, Some(token_contract));
    assert!(!grant.funded);
}