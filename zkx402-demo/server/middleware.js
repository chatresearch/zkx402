import { getAddress } from "viem";
import { exact } from "x402/schemes";
import {
  computeRoutePatterns,
  findMatchingPaymentRequirements,
  findMatchingRoute,
  processPriceToAtomicAmount,
  toJsonSafe,
} from "x402/shared";
import { getPaywallHtml } from "x402/paywall";
import {
  moneySchema,
  settleResponseHeader,
  SupportedEVMNetworks,
  SupportedSVMNetworks,
} from "x402/types";
import { useFacilitator } from "x402/verify";

/**
 * Creates a payment middleware factory for Express
 *
 * @param payTo - The address to receive payments
 * @param routes - Configuration for protected routes and their payment requirements
 * @param facilitator - Optional configuration for the payment facilitator service
 * @param paywall - Optional configuration for the default paywall
 * @returns An Express middleware handler
 *
 * @example
 * ```javascript
 * // Simple configuration - All endpoints are protected by $0.01 of USDC on base-sepolia
 * app.use(paymentMiddleware(
 *   '0x123...', // payTo address
 *   {
 *     price: '$0.01', // USDC amount in dollars
 *     network: 'base-sepolia'
 *   },
 *   // Optional facilitator configuration. Defaults to x402.org/facilitator for testnet usage
 * ));
 *
 * // Advanced configuration - Endpoint-specific payment requirements & custom facilitator
 * app.use(paymentMiddleware('0x123...', // payTo: The address to receive payments*    {
 *   {
 *     '/weather/*': {
 *       price: '$0.001', // USDC amount in dollars
 *       network: 'base',
 *       config: {
 *         description: 'Access to weather data'
 *       }
 *     }
 *   },
 *   {
 *     url: 'https://facilitator.example.com',
 *     createAuthHeaders: async () => ({
 *       verify: { "Authorization": "Bearer token" },
 *       settle: { "Authorization": "Bearer token" }
 *     })
 *   },
 *   {
 *     cdpClientKey: 'your-cdp-client-key',
 *     appLogo: '/images/logo.svg',
 *     appName: 'My App',
 *   }
 * ));
 * ```
 */
export function paymentMiddleware(
  payTo,
  routes,
  facilitator,
  paywall,
) {
  const { verify, settle, supported } = useFacilitator(facilitator);
  const x402Version = 1;

  // Pre-compile route patterns to regex and extract verbs
  const routePatterns = computeRoutePatterns(routes);

  return async function paymentMiddleware(
    req,
    res,
    next,
  ) {
    const matchingRoute = findMatchingRoute(routePatterns, req.path, req.method.toUpperCase());

    if (!matchingRoute) {
      return next();
    }

    const { price, network, config = {} } = matchingRoute.config;
    const {
      description,
      mimeType,
      maxTimeoutSeconds,
      inputSchema,
      outputSchema,
      customPaywallHtml,
      resource,
      discoverable,
      extra: extraConfig,
    } = config;

    // Read user proofs from header for verification and dynamic pricing
    let userProofs = [];
    const userProofsHeader = req.headers['x-user-proofs'];
    if (userProofsHeader) {
      try {
        userProofs = JSON.parse(userProofsHeader);
        console.log('Received user proofs:', userProofs);
      } catch (error) {
        console.error('Failed to parse X-User-Proofs header:', error);
      }
    }

    // Custom function to verify user proofs against requested proofs
    /**
     * Verifies if user has all required proofs for a discount option
     * @param {string[]} userProofs - Array of proofs the user claims to have
     * @param {string[]} requestedProofs - Array of proofs required for the discount
     * @returns {Object} Verification result with isValid flag and details
     */
    function verifyProofs(userProofs, requestedProofs) {
      // Normalize proofs (trim whitespace, handle case sensitivity)
      const normalizedUserProofs = userProofs.map(p => p.trim().toLowerCase());
      const normalizedRequestedProofs = requestedProofs.map(p => p.trim().toLowerCase());
      
      // Check if user has all required proofs
      const missingProofs = normalizedRequestedProofs.filter(
        requiredProof => !normalizedUserProofs.includes(requiredProof)
      );
      
      const hasAllProofs = missingProofs.length === 0;
      
      // Additional verification logic can be added here:
      // - Check proof expiration dates
      // - Verify proof signatures/cryptographic validity
      // - Check proof issuer authenticity
      // - Validate proof format/structure
      
      return {
        isValid: hasAllProofs,
        hasAllProofs: hasAllProofs,
        missingProofs: missingProofs,
        userProofs: normalizedUserProofs,
        requestedProofs: normalizedRequestedProofs,
        verifiedCount: normalizedRequestedProofs.length - missingProofs.length,
        totalRequired: normalizedRequestedProofs.length,
      };
    }

    // Verify proofs against variableAmountRequired and adjust price if qualified
    let finalPrice = price;
    let verificationMetadata = null;
    
    if (userProofs.length > 0 && extraConfig?.variableAmountRequired) {
      const variableAmountRequired = extraConfig.variableAmountRequired;
      
      // Check each discount option
      for (const discountOption of variableAmountRequired) {
        const requestedProofs = discountOption.requestedProofs?.split(",").map((p) => p.trim()) || [];
        const discountedAmount = discountOption.amountRequired;
        
        // Use custom verification function to verify proofs
        const verificationResult = verifyProofs(userProofs, requestedProofs);
        
        console.log('Proof verification result:', {
          requestedProofs: discountOption.requestedProofs,
          verificationResult: verificationResult,
        });
        
        // Check if user has all required proofs for this discount
        if (verificationResult.isValid) {
          console.log(`✓ User qualified for discount! Requested: ${discountOption.requestedProofs}, Discounted amount: ${discountedAmount}`);
          
          // Convert discounted atomic amount to price format
          // amountRequired is in atomic units (e.g., "5000" = 0.005 USDC for 6 decimals)
          // We need to convert it back to dollar format for processPriceToAtomicAmount
          const discountedAmountNum = BigInt(discountedAmount);
          const usdcDecimals = 6n;
          const dollarAmount = Number(discountedAmountNum) / Number(10n ** usdcDecimals);
          
          // Use the discounted amount as the new price
          finalPrice = `$${dollarAmount.toFixed(6)}`;
          
          verificationMetadata = {
            qualified: true,
            discountApplied: true,
            requestedProofs: discountOption.requestedProofs,
            discountedAmount: discountedAmount,
            discountedPrice: finalPrice,
            userProofs: userProofs,
            verificationResult: verificationResult,
          };
          break; // Use first matching discount
        }
      }
      
      if (!verificationMetadata) {
        console.log('✗ User did not qualify for any discount');
        // Get verification result for the last checked option (if any)
        const lastVerification = variableAmountRequired.length > 0 
          ? verifyProofs(userProofs, variableAmountRequired[0].requestedProofs?.split(",").map((p) => p.trim()) || [])
          : null;
        
        verificationMetadata = {
          qualified: false,
          discountApplied: false,
          userProofs: userProofs,
          verificationResult: lastVerification,
        };
      }
    }

    // Store verification metadata for use in route handler
    req.verificationMetadata = verificationMetadata;

    const atomicAmountForAsset = processPriceToAtomicAmount(finalPrice, network);
    if ("error" in atomicAmountForAsset) {
      throw new Error(atomicAmountForAsset.error);
    }
    const { maxAmountRequired, asset } = atomicAmountForAsset;

    const resourceUrl =
      resource || `${req.protocol}://${req.headers.host}${req.path}`;

    let paymentRequirements = [];

    // TODO: create a shared middleware function to build payment requirements
    // evm networks
    if (SupportedEVMNetworks.includes(network)) {
      paymentRequirements.push({
        scheme: "exact",
        network,
        maxAmountRequired,
        resource: resourceUrl,
        description: description ?? "",
        mimeType: mimeType ?? "",
        payTo: getAddress(payTo),
        maxTimeoutSeconds: maxTimeoutSeconds ?? 60,
        asset: getAddress(asset.address),
        // TODO: Rename outputSchema to requestStructure
        outputSchema: {
          input: {
            type: "http",
            method: req.method.toUpperCase(),
            discoverable: discoverable ?? true,
            ...inputSchema,
          },
          output: outputSchema,
        },
        extra: {
          ...asset.eip712,
          ...extraConfig,
        }, 
        // TODO: add zk requests here
      });
    }

    // svm networks
    else if (SupportedSVMNetworks.includes(network)) {
      // get the supported payments from the facilitator
      const paymentKinds = await supported();

      // find the payment kind that matches the network and scheme
      let feePayer;
      for (const kind of paymentKinds.kinds) {
        if (kind.network === network && kind.scheme === "exact") {
          feePayer = kind?.extra?.feePayer;
          break;
        }
      }

      // if no fee payer is found, throw an error
      if (!feePayer) {
        throw new Error(`The facilitator did not provide a fee payer for network: ${network}.`);
      }

      paymentRequirements.push({
        scheme: "exact",
        network,
        maxAmountRequired,
        resource: resourceUrl,
        description: description ?? "",
        mimeType: mimeType ?? "",
        payTo: payTo,
        maxTimeoutSeconds: maxTimeoutSeconds ?? 60,
        asset: asset.address,
        // TODO: Rename outputSchema to requestStructure
        outputSchema: {
          input: {
            type: "http",
            method: req.method.toUpperCase(),
            discoverable: discoverable ?? true,
            ...inputSchema,
          },
          output: outputSchema,
        },
        extra: {
          feePayer,
        },
      });
    } else {
      throw new Error(`Unsupported network: ${network}`);
    }

    const payment = req.header("X-PAYMENT");
    const userAgent = req.header("User-Agent") || "";
    const acceptHeader = req.header("Accept") || "";
    const isWebBrowser = acceptHeader.includes("text/html") && userAgent.includes("Mozilla");

    if (!payment) {
      // TODO handle paywall html for solana
      if (isWebBrowser) {
        let displayAmount;
        if (typeof price === "string" || typeof price === "number") {
          const parsed = moneySchema.safeParse(price);
          if (parsed.success) {
            displayAmount = parsed.data;
          } else {
            displayAmount = Number.NaN;
          }
        } else {
          displayAmount = Number(price.amount) / 10 ** price.asset.decimals;
        }

        const html =
          customPaywallHtml ||
          getPaywallHtml({
            amount: displayAmount,
            paymentRequirements: toJsonSafe(paymentRequirements),
            currentUrl: req.originalUrl,
            testnet: network === "base-sepolia",
            cdpClientKey: paywall?.cdpClientKey,
            appName: paywall?.appName,
            appLogo: paywall?.appLogo,
            sessionTokenEndpoint: paywall?.sessionTokenEndpoint,
          });
        res.status(402).send(html);
        return;
      }
      res.status(402).json({
        x402Version,
        error: "X-PAYMENT header is required",
        accepts: toJsonSafe(paymentRequirements),
      });
      return;
    }

    let decodedPayment;
    try {
      decodedPayment = exact.evm.decodePayment(payment);
      decodedPayment.x402Version = x402Version;
    } catch (error) {
      console.error(error);
      res.status(402).json({
        x402Version,
        error: error || "Invalid or malformed payment header",
        accepts: toJsonSafe(paymentRequirements),
      });
      return;
    }

    const selectedPaymentRequirements = findMatchingPaymentRequirements(
      paymentRequirements,
      decodedPayment,
    );
    if (!selectedPaymentRequirements) {
      res.status(402).json({
        x402Version,
        error: "Unable to find matching payment requirements",
        accepts: toJsonSafe(paymentRequirements),
      });
      return;
    }

    try {
      const response = await verify(decodedPayment, selectedPaymentRequirements);
      if (!response.isValid) {
        res.status(402).json({
          x402Version,
          error: response.invalidReason,
          accepts: toJsonSafe(paymentRequirements),
          payer: response.payer,
        });
        return;
      }
    } catch (error) {
      console.error(error);
      res.status(402).json({
        x402Version,
        error,
        accepts: toJsonSafe(paymentRequirements),
      });
      return;
    }

    // Intercept and buffer all core methods that can commit response to client
    const originalWriteHead = res.writeHead.bind(res);
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);
    const originalFlushHeaders = res.flushHeaders.bind(res);

    let bufferedCalls = [];
    let settled = false;

    res.writeHead = function (...args) {
      if (!settled) {
        bufferedCalls.push(["writeHead", args]);
        return res;
      }
      return originalWriteHead(...args);
    };

    res.write = function (...args) {
      if (!settled) {
        bufferedCalls.push(["write", args]);
        return true;
      }
      return originalWrite(...args);
    };

    res.end = function (...args) {
      if (!settled) {
        bufferedCalls.push(["end", args]);
        return res;
      }
      return originalEnd(...args);
    };

    res.flushHeaders = function () {
      if (!settled) {
        bufferedCalls.push(["flushHeaders", []]);
        return;
      }
      return originalFlushHeaders();
    };

    // Proceed to the next middleware or route handler
    await next();

    // If the response from the protected route is >= 400, do not settle payment
    if (res.statusCode >= 400) {
      settled = true; // stop intercepting calls
      res.writeHead = originalWriteHead;
      res.write = originalWrite;
      res.end = originalEnd;
      res.flushHeaders = originalFlushHeaders;
      // Replay all buffered calls in order
      for (const [method, args] of bufferedCalls) {
        if (method === "writeHead")
          originalWriteHead(...args);
        else if (method === "write") originalWrite(...args);
        else if (method === "end") originalEnd(...args);
        else if (method === "flushHeaders") originalFlushHeaders();
      }
      bufferedCalls = [];
      return;
    }

    try {
      const settleResponse = await settle(decodedPayment, selectedPaymentRequirements);
      const responseHeader = settleResponseHeader(settleResponse);
      res.setHeader("X-PAYMENT-RESPONSE", responseHeader);

      // if the settle fails, return an error
      if (!settleResponse.success) {
        bufferedCalls = [];
        res.status(402).json({
          x402Version,
          error: settleResponse.errorReason,
          accepts: toJsonSafe(paymentRequirements),
        });
        return;
      }
    } catch (error) {
      console.error(error);
      // If settlement fails and the response hasn't been sent yet, return an error
      if (!res.headersSent) {
        bufferedCalls = [];
        res.status(402).json({
          x402Version,
          error,
          accepts: toJsonSafe(paymentRequirements),
        });
        return;
      }
    } finally {
      settled = true;
      res.writeHead = originalWriteHead;
      res.write = originalWrite;
      res.end = originalEnd;
      res.flushHeaders = originalFlushHeaders;

      // Replay all buffered calls in order
      for (const [method, args] of bufferedCalls) {
        if (method === "writeHead")
          originalWriteHead(...args);
        else if (method === "write") originalWrite(...args);
        else if (method === "end") originalEnd(...args);
        else if (method === "flushHeaders") originalFlushHeaders();
      }
      bufferedCalls = [];
    }
  };
}
