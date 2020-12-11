FROM docker.jamba.net/build/bionic-nodejs:14 as build

COPY . /srv/www/kube-ldap
RUN  cd /srv/www/kube-ldap && \
  sudo chown -R build /srv/www/kube-ldap && \
  npm config delete proxy && \
  npm config delete https-proxy && \
  yarn install && \
  yarn run test && \
  yarn run build && \
  yarn install --production=true

FROM docker.jamba.net/base/bionic-nodejs:14

COPY --from=build /srv/www/kube-ldap /srv/www/kube-ldap

CMD ["node", "--use-openssl-ca", "--abort-on-uncaught-exception", "/srv/www/kube-ldap/build/index.js"]
