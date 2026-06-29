/**
 * Unit tests for new offerwall / ad-network integrations.
 *
 * These tests verify:
 * - Configuration loading
 * - Offerwall / ad URL generation
 * - Postback signature verification
 * - Postback payload parsing (user ID & transaction ID extraction)
 * - Duplicate-prevention logic in the shared helper
 *
 * Run with: npx tsx --test server/tests/integrations.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import crypto from "crypto";

import * as clickadu from "../services/clickadu";
import * as monlix from "../services/monlix";
import * as gemiads from "../services/gemiads";
import * as earnwall from "../services/earnwall";
import * as pollmatic from "../services/pollmatic";
import * as rewardsOfferwall from "../services/rewards-offerwall";
import * as offerwallMe from "../services/offerwall-me";
import { isConversionDuplicate } from "../lib/offerwall-helpers";

const secret = "test-secret";
const userId = "42";
const transactionId = "txn-123";
const amount = "1.25";

function withEnv(vars: Record<string, string>, fn: () => void) {
  const original: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) {
    original[key] = process.env[key];
    process.env[key] = vars[key];
  }
  try {
    fn();
  } finally {
    for (const key of Object.keys(vars)) {
      if (original[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original[key];
      }
    }
  }
}

describe("Clickadu service", () => {
  it("loads config from environment", () => {
    withEnv(
      {
        CLICKADU_ENABLED: "true",
        CLICKADU_PUBLISHER_ID: "pub-1",
        CLICKADU_API_KEY: "key-1",
        CLICKADU_SECRET_KEY: "secret-1",
        CLICKADU_REWARD_MULTIPLIER: "0.8",
      },
      () => {
        const config = clickadu.getClickaduConfig();
        assert.strictEqual(config.enabled, true);
        assert.strictEqual(config.publisherId, "pub-1");
        assert.strictEqual(config.apiKey, "key-1");
        assert.strictEqual(config.secretKey, "secret-1");
        assert.strictEqual(config.rewardMultiplier, 0.8);
      }
    );
  });

  it("builds an encoded ad tag URL", () => {
    const url = clickadu.buildAdTagUrl("pub-1", "key-1", "user@domain.com");
    assert.ok(url.includes("pub=pub-1"));
    assert.ok(url.includes("api_key=key-1"));
    assert.ok(url.includes("user_id=user%40domain.com"));
  });

  it("verifies a valid SHA-256 signature", () => {
    const expected = crypto.createHash("sha256").update(`${userId}:${transactionId}:${amount}:${secret}`).digest("hex");
    assert.strictEqual(clickadu.verifySignature(userId, transactionId, amount, secret, expected), true);
  });

  it("rejects an invalid signature", () => {
    assert.strictEqual(clickadu.verifySignature(userId, transactionId, amount, secret, "bad-sig"), false);
  });

  it("parses valid postback payload", () => {
    const payload = clickadu.parsePostbackPayload({
      user_id: userId,
      transaction_id: transactionId,
      amount,
      signature: "sig",
      status: "1",
      payout: "0.5",
    });
    assert.ok(payload);
    assert.strictEqual(payload!.userId, userId);
    assert.strictEqual(payload!.transactionId, transactionId);
    assert.strictEqual(payload!.amount, amount);
  });

  it("returns null when required postback fields are missing", () => {
    assert.strictEqual(clickadu.parsePostbackPayload({ user_id: userId }), null);
  });
});

describe("Monlix service", () => {
  it("loads config from environment", () => {
    withEnv(
      {
        MONLIX_ENABLED: "true",
        MONLIX_PUBLISHER_ID: "pub-2",
        MONLIX_API_KEY: "key-2",
        MONLIX_SECRET_KEY: "secret-2",
        MONLIX_REWARD_MULTIPLIER: "1.2",
      },
      () => {
        const config = monlix.getMonlixConfig();
        assert.strictEqual(config.enabled, true);
        assert.strictEqual(config.rewardMultiplier, 1.2);
      }
    );
  });

  it("builds an offerwall URL", () => {
    const url = monlix.buildOfferwallUrl("pub-2", "key-2", 99);
    assert.ok(url.includes("pub-2"));
    assert.ok(url.includes("key-2"));
    assert.ok(url.includes("user_id=99"));
  });

  it("verifies a valid MD5 signature", () => {
    const expected = crypto.createHash("md5").update(`${userId}${transactionId}${amount}${secret}`).digest("hex");
    assert.strictEqual(monlix.verifySignature(userId, transactionId, amount, secret, expected), true);
  });

  it("rejects an invalid signature", () => {
    assert.strictEqual(monlix.verifySignature(userId, transactionId, amount, secret, "bad"), false);
  });
});

describe("GemiAds service", () => {
  it("loads config from environment", () => {
    withEnv(
      {
        GEMIADS_ENABLED: "true",
        GEMIADS_PUBLISHER_ID: "pub-3",
        GEMIADS_API_KEY: "key-3",
        GEMIADS_SECRET_KEY: "secret-3",
        GEMIADS_REWARD_MULTIPLIER: "0.9",
      },
      () => {
        const config = gemiads.getGemiAdsConfig();
        assert.strictEqual(config.enabled, true);
        assert.strictEqual(config.rewardMultiplier, 0.9);
      }
    );
  });

  it("builds an offerwall URL", () => {
    const url = gemiads.buildOfferwallUrl("pub-3", "key-3", 7);
    assert.ok(url.includes("pub=pub-3"));
    assert.ok(url.includes("user_id=7"));
  });

  it("verifies a valid MD5 signature", () => {
    const expected = crypto.createHash("md5").update(`${userId}${transactionId}${amount}${secret}`).digest("hex");
    assert.strictEqual(gemiads.verifySignature(userId, transactionId, amount, secret, expected), true);
  });
});

describe("EarnWall service", () => {
  it("loads config from environment", () => {
    withEnv(
      {
        EARNWALL_ENABLED: "true",
        EARNWALL_PUBLISHER_ID: "pub-4",
        EARNWALL_API_KEY: "key-4",
        EARNWALL_SECRET_KEY: "secret-4",
        EARNWALL_REWARD_MULTIPLIER: "1.5",
      },
      () => {
        const config = earnwall.getEarnWallConfig();
        assert.strictEqual(config.enabled, true);
        assert.strictEqual(config.rewardMultiplier, 1.5);
      }
    );
  });

  it("builds offerwall, video, and survey URLs", () => {
    const offerwallUrl = earnwall.buildOfferwallUrl("pub-4", "key-4", 5);
    const videoUrl = earnwall.buildVideoAdsUrl("pub-4", "key-4", 5);
    const surveyUrl = earnwall.buildSurveysUrl("pub-4", "key-4", 5);
    assert.ok(offerwallUrl.includes("offerwall"));
    assert.ok(videoUrl.includes("videos"));
    assert.ok(surveyUrl.includes("surveys"));
  });

  it("parses conversion type", () => {
    const payload = earnwall.parsePostbackPayload({
      user_id: userId,
      transaction_id: transactionId,
      amount,
      signature: "sig",
      type: "video",
    });
    assert.strictEqual(payload!.conversionType, "video");
  });
});

describe("Pollmatic service", () => {
  it("loads config from environment", () => {
    withEnv(
      {
        POLLMATIC_ENABLED: "true",
        POLLMATIC_API_KEY: "api-key",
        POLLMATIC_SECRET_KEY: "secret",
        POLLMATIC_REWARD_MULTIPLIER: "1.1",
      },
      () => {
        const config = pollmatic.getPollmaticConfig();
        assert.strictEqual(config.enabled, true);
        assert.strictEqual(config.apiKey, "api-key");
        assert.strictEqual(config.rewardMultiplier, 1.1);
      }
    );
  });

  it("builds offerwall and surveys API URLs", () => {
    const wall = pollmatic.buildOfferwallUrl("api-key", 8);
    const surveys = pollmatic.buildSurveysApiUrl("api-key", 8, "1.2.3.4", "Mozilla/5.0");
    assert.ok(wall.includes("pollmatic.io/offerwall/api-key/8"));
    assert.ok(surveys.includes("pollmatic.io/api/surveys.php"));
    assert.ok(surveys.includes("sub_id=8"));
    assert.ok(surveys.includes("client_ip=1.2.3.4"));
  });

  it("verifies a valid MD5 signature", () => {
    const expected = crypto.createHash("md5").update(`${userId}${transactionId}${amount}${secret}`).digest("hex");
    assert.strictEqual(pollmatic.verifySignature(userId, transactionId, amount, secret, expected), true);
  });

  it("parses status and offer type", () => {
    const payload = pollmatic.parsePostbackPayload({
      subId: userId,
      transId: transactionId,
      reward: amount,
      signature: "sig",
      status: "2",
      offer_type: "survey",
      payout: "0.5",
    });
    assert.strictEqual(payload!.status, "2");
    assert.strictEqual(payload!.offer_type, "survey");
  });
});

describe("Rewards Offerwall service", () => {
  it("loads config from environment", () => {
    withEnv(
      {
        REWARDS_OFFERWALL_ENABLED: "true",
        REWARDS_OFFERWALL_PUBLISHER_ID: "pub-5",
        REWARDS_OFFERWALL_API_KEY: "key-5",
        REWARDS_OFFERWALL_SECRET_KEY: "secret-5",
        REWARDS_OFFERWALL_REWARD_MULTIPLIER: "0.75",
      },
      () => {
        const config = rewardsOfferwall.getRewardsOfferwallConfig();
        assert.strictEqual(config.enabled, true);
        assert.strictEqual(config.rewardMultiplier, 0.75);
      }
    );
  });

  it("verifies a valid MD5 signature", () => {
    const expected = crypto.createHash("md5").update(`${userId}${transactionId}${amount}${secret}`).digest("hex");
    assert.strictEqual(rewardsOfferwall.verifySignature(userId, transactionId, amount, secret, expected), true);
  });
});

describe("Offerwall.me service", () => {
  it("loads config from environment", () => {
    withEnv(
      {
        OFFERWALL_ME_ENABLED: "true",
        OFFERWALL_ME_PUBLISHER_ID: "pub-6",
        OFFERWALL_ME_API_KEY: "key-6",
        OFFERWALL_ME_SECRET_KEY: "secret-6",
        OFFERWALL_ME_REWARD_MULTIPLIER: "1.3",
      },
      () => {
        const config = offerwallMe.getOfferwallMeConfig();
        assert.strictEqual(config.enabled, true);
        assert.strictEqual(config.rewardMultiplier, 1.3);
      }
    );
  });

  it("verifies a valid SHA-256 signature", () => {
    const expected = crypto.createHash("sha256").update(`${userId}${transactionId}${amount}${secret}`).digest("hex");
    assert.strictEqual(offerwallMe.verifySignature(userId, transactionId, amount, secret, expected), true);
  });
});

describe("Shared helper duplicate prevention", () => {
  it("isConversionDuplicate requires a database connection", async () => {
    // This function queries the live database. If DATABASE_URL is set, it
    // performs a real lookup; otherwise it will throw on connection.
    // The important property is that it uses the unique transaction_id index.
    if (!process.env.DATABASE_URL) {
      await assert.rejects(async () => isConversionDuplicate("test", "tx-1"));
      return;
    }
    const duplicate = await isConversionDuplicate("test", "non-existing-tx-99999");
    assert.strictEqual(duplicate, false);
  });
});
