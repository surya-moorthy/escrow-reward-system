/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/anchor_project.json`.
 */
export type AnchorProject = {
  "address": "GMrRNhm2zodYbHJgZWr1iyqiRn7ExpQCN6cDJe1BcsVX",
  "metadata": {
    "name": "anchorProject",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "addSupportedToken",
      "discriminator": [
        109,
        142,
        133,
        205,
        240,
        28,
        197,
        245
      ],
      "accounts": [
        {
          "name": "stakingPool",
          "writable": true
        },
        {
          "name": "mint"
        },
        {
          "name": "vault"
        },
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "stakingPool"
          ]
        }
      ],
      "args": [
        {
          "name": "rewardRate",
          "type": "u64"
        },
        {
          "name": "vaultBump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "initializePool",
      "discriminator": [
        95,
        180,
        10,
        172,
        84,
        174,
        232,
        40
      ],
      "accounts": [
        {
          "name": "stakingPool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  105,
                  110,
                  103,
                  45,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "admin"
              }
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "stakeToken",
      "discriminator": [
        191,
        127,
        193,
        101,
        37,
        96,
        87,
        211
      ],
      "accounts": [
        {
          "name": "stakingPool",
          "writable": true
        },
        {
          "name": "staker",
          "writable": true,
          "signer": true
        },
        {
          "name": "stakerTokenAccount",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "stakingPool"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "userStake",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  45,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "staker"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "unstake",
      "discriminator": [
        90,
        95,
        107,
        42,
        205,
        124,
        50,
        225
      ],
      "accounts": [
        {
          "name": "stakingPool",
          "writable": true
        },
        {
          "name": "userStake",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  45,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "staker"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "staker",
          "writable": true,
          "signer": true
        },
        {
          "name": "stakerTokenAccount",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "stakingPool"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "stakingPool",
      "discriminator": [
        203,
        19,
        214,
        220,
        220,
        154,
        24,
        102
      ]
    },
    {
      "name": "userStakeAccount",
      "discriminator": [
        167,
        87,
        153,
        81,
        129,
        95,
        15,
        213
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unsupportedToken",
      "msg": "Staking pool does not support this token"
    },
    {
      "code": 6001,
      "name": "invalidVault",
      "msg": "Invalid vault account"
    },
    {
      "code": 6002,
      "name": "insufficientBalance",
      "msg": "Insufficient token balance to stake"
    },
    {
      "code": 6003,
      "name": "insufficientStake",
      "msg": "Insufficient staked amount"
    },
    {
      "code": 6004,
      "name": "invalidAmount",
      "msg": "Staking amount must be greater than zero"
    },
    {
      "code": 6005,
      "name": "numericalOverflow",
      "msg": "Numerical overflow occurred"
    },
    {
      "code": 6006,
      "name": "tokenAlreadySupported",
      "msg": "Token Already initialized"
    },
    {
      "code": 6007,
      "name": "overflow",
      "msg": "over the limit"
    }
  ],
  "types": [
    {
      "name": "stakingPool",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "supportedTokens",
            "type": {
              "vec": {
                "defined": {
                  "name": "supportedToken"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "supportedToken",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "vaultBump",
            "type": "u8"
          },
          {
            "name": "rewardRate",
            "type": "u64"
          },
          {
            "name": "totalStaked",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "userStakeAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "staker",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "startTime",
            "type": "i64"
          },
          {
            "name": "rewardDebt",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
