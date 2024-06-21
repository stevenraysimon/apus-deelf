const path = require("path");
const fastify = require('fastify')({ logger: true }); // Configure fastify with logger enabled

const bodyParser = require('body-parser');
const fs = require('fs').promises;
const axios = require('axios');
const fetchHTML = require('./fetch-html-web');

// Setup our static files
fastify.register(require("@fastify/static"), {
  root: path.join(__dirname, "public"),
  prefix: "/", // optional: default '/'
});

// Formbody lets us parse incoming forms
fastify.register(require("@fastify/formbody"));

// View is a templating manager for fastify
fastify.register(require("@fastify/view"), {
  engine: {
    handlebars: require("handlebars"),
  },
});

// Load and parse SEO data
const seo = require("./src/seo.json");
if (seo.url === "glitch-default") {
  seo.url = `https://${process.env.PROJECT_DOMAIN}.glitch.me`;
}

/**
 * Our home page route
 *
 * Returns src/pages/index.hbs with data built into it
 */
fastify.get("/", async (request, reply) => {
  // params is an object we'll pass to our handlebars template
  let params = { seo: seo };

  // The Handlebars code will be able to access the parameter values and build them into the page
  return reply.view("/public/index.html", params);
});

/**
 * Our POST route to handle and react to form submissions
 *
 * Accepts body data indicating the user choice
 */
// Route to handle form submissions with fastify
fastify.post('/convert', async (request, reply) => {
  const { originalHTMLUrl, reverseModals } = request.body; // Get the URL from the request body
  console.log('Received URL:', originalHTMLUrl); // Log the URL to the console
  console.log('Reverse Modal Links:', reverseModals); // Log the checkbox value to the console

  try {
    const fetchedData = await fetchHTML(originalHTMLUrl, reverseModals);
    const htmlCode = `<xmp>${fetchedData}</xmp>`;
    reply.type('text/html').send(htmlCode);
  } catch (error) {
    console.error('Error fetching HTML:', error);
    reply.status(500).send('Error fetching HTML');
  }
});

// Run the server and report out to the logs
fastify.listen(process.env.PORT || 3000, '0.0.0.0', (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Your app is listening on ${address}`);
});