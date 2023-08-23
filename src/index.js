const http = require('http');
const { Client } = require('memjs');
const { PeopleRepository } = require('./repositories/peopleRepository');

const memcached = Client.create();

// Start repository
const peopleRepository = new PeopleRepository();

const verifyCacheMiddleware = (request, response, next) => {
  const { id, t } = request.queryString;

  if (t) return next();

  memcached.get(id, (err, value) => {
    if (err) throw new Error(err);

    if (value !== null) {
      console.log('<- Sending response for /pessoas:get from cache');

      response.setHeader('Content-Type', 'application/json');
      response.writeHead(200);

      return response.end(JSON.stringify(JSON.parse(value)));
    } else {
      return next();
    }
  });
};

const routes = {
  '/pessoas:get': async (request, response) => {
    const { id, t } = request.queryString;

    console.log('-> Received new request for /pessoas:get');

    verifyCacheMiddleware(request, response, async () => {
      if (t) {
        const result = await peopleRepository.search(t);

        if (result.length === 0 || !result) {
          response.setHeader('Content-Type', 'application/json');
          response.writeHead(200);

          console.log('<- Sending response for /pessoas:get when not found search');

          return response.end(JSON.stringify([]));
        }

        response.setHeader('Content-Type', 'application/json');
        response.writeHead(200);

        console.log('<- Sending response for /pessoas:get');

        return response.end(JSON.stringify(result));
      }

      const people = await peopleRepository.find(id);

      response.write(JSON.stringify(people));

      console.log('<- Sending response for /pessoas:get', { people });

      return response.end();
    });
  },

  '/contagem-pessoas:get': async (request, response) => {
    console.log('-> Received new request for /contagem-pessoas:get');

    const count = await peopleRepository.count();

    response.setHeader('Content-Type', 'application/json');
    response.writeHead(200);

    console.log('<- Sending response for contagem-pessoas:get');

    return response.end(JSON.stringify(count));
  },

  '/pessoas:post': async (request, response) => {
    for await (const data of request) {
      try {
        const item = JSON.parse(data);

        console.log('-> Received new request for /pessoas:post');

        const people = await peopleRepository.create(item);

        const { id } = people;

        response.setHeader('Content-Type', 'application/json');
        response.setHeader('Location', `/pessoas/${id}`);
        response.writeHead(201);

        await memcached.set(id, JSON.stringify(people), { expires: 360 });

        console.log('<- Sending response for /pessoas:post');

        return response.end(JSON.stringify(people));
      } catch (error) {
        return handleError(response)(error);
      }
    }
  },
};

const handleError = (response) => {
  return (error) => {
    console.error('Error', error);

    if (error.name === 'ValidationError') {
      response.setHeader('Content-Type', 'application/json');
      response.writeHead(400);

      return response.end(JSON.stringify({ error: error.message }));
    }

    if (error.code === '23505' || error.name === 'ValidationField') {
      response.setHeader('Content-Type', 'application/json');
      response.writeHead(422);

      return response.end(JSON.stringify({ error: error.message }));
    }

    if (error.code === '22008') {
      response.setHeader('Content-Type', 'application/json');
      response.writeHead(400);

      return response.end(JSON.stringify({ error: error.message }));
    }

    if (error.message) {
      response.setHeader('Content-Type', 'application/json');
      response.writeHead(500);

      return response.end(JSON.stringify({ error: error.message }));
    }

    response.setHeader('Content-Type', 'application/json');
    response.writeHead(500);

    return response.end(JSON.stringify({ error: 'Internal server error' }));
  };
};

const handler = (request, response) => {
  const { url, method } = request;

  let [, route, id] = url.split('/');

  const [, t] = url.split('?t=');

  request.queryString = { t, id };

  // If trying using get route, if does not contagem-pessoas route, but do not pass id or t parameter, throw error
  if (method === 'GET' && !id && !t && !route.includes('contagem-pessoas')) {
    response.setHeader('Content-Type', 'application/json');
    response.writeHead(400);

    return response.end(JSON.stringify({ error: 'Query string t is required' }));
  }

  [route] = route.split('?t=');

  const key = `/${route}:${method.toLowerCase()}`;

  const router = routes[key];

  if (!routes[key]) {
    response.setHeader('Content-Type', 'application/json');
    response.writeHead(404);

    return response.end(JSON.stringify({ error: 'Resource not found' }));
  }

  return router(request, response).catch(handleError(response));
};

http.createServer(handler).listen(80, () => console.log('Server is running on 80 port'));
