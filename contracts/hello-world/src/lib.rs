#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short,
    token, Address, Env, Map,
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
    pub token: Option<Address>,
    pub funded: bool,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum GrantError {
    GrantExists = 1,
    GrantNotFound = 2,
    InvalidAmount = 3,
    AlreadyFunded = 4,
    NotTokenGrant = 5,
    RecipientMissing = 6,
    GrantNotFunded = 7,
}

const GRANTS_KEY: soroban_sdk::Symbol = symbol_short!("GRANTS");

fn load_grants(env: &Env) -> Map<u32, Grant> {
    env.storage()
        .instance()
        .get(&GRANTS_KEY)
        .unwrap_or(Map::new(env))
}

fn save_grants(env: &Env, grants: &Map<u32, Grant>) {
    env.storage().instance().set(&GRANTS_KEY, grants);
}

fn get_grant_or_err(grants: &Map<u32, Grant>, grant_id: u32) -> Result<Grant, GrantError> {
    grants.get(grant_id).ok_or(GrantError::GrantNotFound)
}

#[contractimpl]
impl GrantContract {
    pub fn create_grant(env: Env, creator: Address, id: u32, amount: i128) -> Result<(), GrantError> {
        creator.require_auth();

        if amount <= 0 {
            return Err(GrantError::InvalidAmount);
        }

        let mut grants = load_grants(&env);
        if grants.contains_key(id) {
            return Err(GrantError::GrantExists);
        }

        let grant = Grant {
            id,
            creator: creator.clone(),
            amount,
            recipient: None,
            approved: false,
            token: None,
            funded: false,
        };

        grants.set(id, grant);
        save_grants(&env, &grants);
        env.events().publish((symbol_short!("grant"), symbol_short!("create")), id);
        Ok(())
    }

    pub fn create_token_grant(
        env: Env,
        creator: Address,
        id: u32,
        token_contract: Address,
        amount: i128,
    ) -> Result<(), GrantError> {
        creator.require_auth();

        if amount <= 0 {
            return Err(GrantError::InvalidAmount);
        }

        let mut grants = load_grants(&env);
        if grants.contains_key(id) {
            return Err(GrantError::GrantExists);
        }

        let grant = Grant {
            id,
            creator,
            amount,
            recipient: None,
            approved: false,
            token: Some(token_contract),
            funded: false,
        };

        grants.set(id, grant);
        save_grants(&env, &grants);
        env.events().publish((symbol_short!("grant"), symbol_short!("tcreate")), id);
        Ok(())
    }

    pub fn apply(env: Env, applicant: Address, grant_id: u32) -> Result<(), GrantError> {
        applicant.require_auth();

        let mut grants = load_grants(&env);
        let mut grant = get_grant_or_err(&grants, grant_id)?;

        grant.recipient = Some(applicant.clone());

        grants.set(grant_id, grant);
        save_grants(&env, &grants);
        env.events().publish((symbol_short!("grant"), symbol_short!("apply")), grant_id);
        Ok(())
    }

    pub fn fund_grant(env: Env, creator: Address, grant_id: u32) -> Result<(), GrantError> {
        creator.require_auth();

        let mut grants = load_grants(&env);
        let mut grant = get_grant_or_err(&grants, grant_id)?;

        if grant.creator != creator {
            return Err(GrantError::GrantNotFound);
        }
        if grant.funded {
            return Err(GrantError::AlreadyFunded);
        }

        let token_contract = grant.token.clone().ok_or(GrantError::NotTokenGrant)?;
        let token_client = token::Client::new(&env, &token_contract);
        let contract_address = env.current_contract_address();

        // Inter-contract call: transfer grant tokens from creator into contract escrow.
        token_client.transfer(&creator, &contract_address, &grant.amount);
        grant.funded = true;

        grants.set(grant_id, grant);
        save_grants(&env, &grants);
        env.events().publish((symbol_short!("grant"), symbol_short!("fund")), grant_id);
        Ok(())
    }

    pub fn approve(env: Env, admin: Address, grant_id: u32) -> Result<(), GrantError> {
        admin.require_auth();

        let mut grants = load_grants(&env);

        let mut grant = get_grant_or_err(&grants, grant_id)?;

        grant.approved = true;

        grants.set(grant_id, grant);
        save_grants(&env, &grants);
        env.events().publish((symbol_short!("grant"), symbol_short!("approve")), grant_id);
        Ok(())
    }

    pub fn disburse_grant(env: Env, admin: Address, grant_id: u32) -> Result<(), GrantError> {
        admin.require_auth();

        let mut grants = load_grants(&env);
        let mut grant = get_grant_or_err(&grants, grant_id)?;

        if !grant.funded {
            return Err(GrantError::GrantNotFunded);
        }

        let recipient = grant.recipient.clone().ok_or(GrantError::RecipientMissing)?;
        let token_contract = grant.token.clone().ok_or(GrantError::NotTokenGrant)?;
        let token_client = token::Client::new(&env, &token_contract);
        let contract_address = env.current_contract_address();

        // Inter-contract call: send escrowed tokens to approved recipient.
        token_client.transfer(&contract_address, &recipient, &grant.amount);

        grant.approved = true;

        grants.set(grant_id, grant);
        save_grants(&env, &grants);
        env.events().publish((symbol_short!("grant"), symbol_short!("disb")), grant_id);
        Ok(())
    }

    pub fn get_grant(env: Env, grant_id: u32) -> Result<Grant, GrantError> {
        let grants = load_grants(&env);
        get_grant_or_err(&grants, grant_id)
    }
}

#[cfg(test)]
mod test;