import "@babel/polyfill";
import dotenv from "dotenv";
import "isomorphic-fetch";
import createShopifyAuth, { verifyRequest } from "@shopify/koa-shopify-auth";
import Shopify, { ApiVersion, DeliveryMethod } from "@shopify/shopify-api";
import Koa from "koa";
import next from "next";
import Router from "koa-router";

dotenv.config();
const port = parseInt(process.env.PORT, 10) || 8081;
const dev = process.env.NODE_ENV !== "production";
const app = next({
  dev,
});
const handle = app.getRequestHandler();

Shopify.Context.initialize({
  API_KEY: process.env.SHOPIFY_API_KEY,
  API_SECRET_KEY: process.env.SHOPIFY_API_SECRET,
  SCOPES: process.env.SCOPES.split(","),
  HOST_NAME: process.env.HOST.replace(/https:\/\/|\/$/g, ""),
  API_VERSION: ApiVersion.January22,
  IS_EMBEDDED_APP: true,
  // This should be replaced with your preferred storage strategy
  SESSION_STORAGE: new Shopify.Session.MemorySessionStorage(),
});

// Storing the currently active shops in memory will force them to re-login when your server restarts. You should
// persist this object in your app.
const ACTIVE_SHOPIFY_SHOPS = {};


//------------WEBHOOKS REGISTRATION-------
//Customer creation
Shopify.Webhooks.Registry.addHandler("CUSTOMERS_CREATE", {
  path: "/webhooks",
  webhookHandler: async (topic, shop, body) =>
    delete ACTIVE_SHOPIFY_SHOPS[shop],
 });

//Order creation
Shopify.Webhooks.Registry.addHandler("ORDERS_CREATE", {
    path: "/webhooks",
    webhookHandler: async (topic, shop, body) =>
      delete ACTIVE_SHOPIFY_SHOPS[shop],
   });

//Product creation
Shopify.Webhooks.Registry.addHandler("PRODUCTS_CREATE", {
  path: "/webhooks",
  webhookHandler: async (topic, shop, body) =>
    delete ACTIVE_SHOPIFY_SHOPS[shop],
 });

//Cart creation
Shopify.Webhooks.Registry.addHandler("CARTS_CREATE", {
  path: "/webhooks",
  webhookHandler: async (topic, shop, body) =>
    delete ACTIVE_SHOPIFY_SHOPS[shop],
 });

//Cart updation
Shopify.Webhooks.Registry.addHandler("CARTS_UPDATE", {
  path: "/webhooks",
  webhookHandler: async (topic, shop, body) =>
    delete ACTIVE_SHOPIFY_SHOPS[shop],
 });

//Customer deletion
Shopify.Webhooks.Registry.addHandler("CUSTOMERS_DELETE", {
  path: "/webhooks",
  webhookHandler: async (topic, shop, body) =>
    delete ACTIVE_SHOPIFY_SHOPS[shop],
 });


app.prepare().then(async () => {
  const server = new Koa();
  const router = new Router();
  server.keys = [Shopify.Context.API_SECRET_KEY];
  server.use(
    createShopifyAuth({
      async afterAuth(ctx) {
        // Access token and shop available in ctx.state.shopify
        const { shop, accessToken, scope } = ctx.state.shopify;
        const host = ctx.query.host;
        ACTIVE_SHOPIFY_SHOPS[shop] = scope;
       
        console.log("Webhooks sucessfully created");
        //customer creation registration in PUB-SUB
        const response1 = await Shopify.Webhooks.Registry.register({
          shop,
          accessToken,
          path: "pubsub://livedemo-344213:webhooklive",
          deliveryMethod : DeliveryMethod.PubSub,
          topic: "CUSTOMERS_CREATE",
        });
        
        if (!response1["CUSTOMERS_CREATE"].success) {
          console.log(
            `Failed to register CUSTOMERS_CREATE webhook: ${response1.result}`
          );
        }

        //Order creation registration in PUB-SUB
        const response2 = await Shopify.Webhooks.Registry.register({
          shop,
          accessToken,
          path: "pubsub://livedemo-344213:webhooklive",
          deliveryMethod : DeliveryMethod.PubSub,
          topic: "ORDERS_CREATE",
        });
        

        if (!response2["ORDERS_CREATE"].success) {
          console.log(
            `Failed to register ORDERS_CREATE webhook: ${response2.result}`
          );
        }
        

        //Product creation registration in PUB-SUB
        const response3 = await Shopify.Webhooks.Registry.register({
          shop,
          accessToken,
          path: "pubsub://livedemo-344213:webhooklive",
          deliveryMethod : DeliveryMethod.PubSub,
          topic: "PRODUCTS_CREATE",
        });
        

        if (!response3["PRODUCTS_CREATE"].success) {
          console.log(
            `Failed to register PRODUCTS_CREATE webhook: ${response3.result}`
          );
        }
        

        //Cart creation registration in PUB-SUB
        const response4 = await Shopify.Webhooks.Registry.register({
          shop,
          accessToken,
          path: "pubsub://livedemo-344213:webhooklive",
          deliveryMethod : DeliveryMethod.PubSub,
          topic: "CARTS_CREATE",
        });
        

        if (!response4["CARTS_CREATE"].success) {
          console.log(
            `Failed to register CARTS_CREATE webhook: ${response4.result}`
          );
        }
      

        //Cart updation in PUB-SUB
        const response5 = await Shopify.Webhooks.Registry.register({
          shop,
          accessToken,
          path: "pubsub://livedemo-344213:webhooklive",
          deliveryMethod : DeliveryMethod.PubSub,
          topic: "CARTS_UPDATE",
        });
        

        if (!response5["CARTS_UPDATE"].success) {
          console.log(
            `Failed to register CARTS_UPDATE webhook: ${response5.result}`
          );
        }
        
        //Customer deletion in PUB-SUB
        
        const response6 = await Shopify.Webhooks.Registry.register({
          shop,
          accessToken,
          path: "pubsub://livedemo-344213:webhooklive",
          deliveryMethod : DeliveryMethod.PubSub,
          topic: "CUSTOMERS_DELETE",
        });
        

        if (!response6["CUSTOMERS_DELETE"].success) {
          console.log(
            `Failed to register CUSTOMERS_DELETE webhook: ${response6.result}`
          );
        }
        

        // Redirect to app with shop parameter upon auth
        ctx.redirect(`/?shop=${shop}&host=${host}`);
      },
    })
  );

  const handleRequest = async (ctx) => {
    await handle(ctx.req, ctx.res);
    ctx.respond = false;
    ctx.res.statusCode = 200;
  };
  
  router.post("/webhooks", async (ctx) => {
    try {
      await Shopify.Webhooks.Registry.process(ctx.req, ctx.res);
      console.log(`Webhook processed, returned status code 200`);
    } catch (error) {
      console.log(`Failed to process webhook: ${error}`);
    }
  });


  //Mandatory webhooks
  // router.post("/customers/data_request", async (ctx) => {
  //   try {
  //     await Shopify.Webhooks.Registry.process(ctx.req, ctx.res);
  //     console.log(`Webhook customer data processed, returned status code 200`);
  //   } catch (error) {
  //     console.log(`Failed to process webhook: ${error}`);
  //   }
  // });

 
  router.post(
    "/graphql",
    verifyRequest({ returnHeader: true }),
    async (ctx, next) => {
      await Shopify.Utils.graphqlProxy(ctx.req, ctx.res);
    }
  );
  
  router.get("(/_next/static/.*)", handleRequest); // Static content is clear
  router.get("/_next/webpack-hmr", handleRequest); // Webpack content is clear
  router.get("(.*)", async (ctx) => {
    const shop = ctx.query.shop;

    // This shop hasn't been seen yet, go through OAuth to create a session
    if (ACTIVE_SHOPIFY_SHOPS[shop] === undefined) {
      ctx.redirect(`/auth?shop=${shop}`);
    } else {
      await handleRequest(ctx);
    }
  });

  server.use(router.allowedMethods());
  server.use(router.routes());
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
