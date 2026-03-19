#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, Map,
};

#[contract]
pub struct GrantContract;

#[derive(Clone)]
#[contracttype] // ✅ THIS FIXES EVERYTHING
pub struct Grant {
    pub id: u32,
    pub creator: Address,
    pub amount: i128,
    pub recipient: Option<Address>,
    pub approved: bool,
}

#[contractimpl]
impl GrantContract {

    pub fn create_grant(env: Env, creator: Address, id: u32, amount: i128) {
        creator.require_auth();

        let mut grants: Map<u32, Grant> =
            env.storage()
                .instance()
                .get(&symbol_short!("GRANTS"))
                .unwrap_or(Map::new(&env));

        let grant = Grant {
            id,
            creator: creator.clone(),
            amount,
            recipient: None,
            approved: false,
        };

        grants.set(id, grant);
        env.storage().instance().set(&symbol_short!("GRANTS"), &grants);
    }

    pub fn apply(env: Env, applicant: Address, grant_id: u32) {
        applicant.require_auth();

        let mut grants: Map<u32, Grant> =
            env.storage().instance().get(&symbol_short!("GRANTS")).unwrap();

        let mut grant = grants.get(grant_id).unwrap();
        grant.recipient = Some(applicant);

        grants.set(grant_id, grant);
        env.storage().instance().set(&symbol_short!("GRANTS"), &grants);
    }

    pub fn approve(env: Env, admin: Address, grant_id: u32) {
        admin.require_auth();

        let mut grants: Map<u32, Grant> =
            env.storage().instance().get(&symbol_short!("GRANTS")).unwrap();

        let mut grant = grants.get(grant_id).unwrap();

        grant.approved = true;

        grants.set(grant_id, grant);
        env.storage().instance().set(&symbol_short!("GRANTS"), &grants);
    }

    pub fn get_grant(env: Env, grant_id: u32) -> Grant {
        let grants: Map<u32, Grant> =
            env.storage().instance().get(&symbol_short!("GRANTS")).unwrap();

        grants.get(grant_id).unwrap()
    }
}