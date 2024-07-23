git clone --branch node-v6.0.1 https://github.com/mongodb/libmongocrypt.git
cd libmongocrypt

# Build libmongocrypt node bindings
cd bindings/node

bash ./etc/build-static.sh

cd ../../..
# Copy and overwrite the existing node bindings
cp -r ./libmongocrypt/bindings/node/ ./node_modules/mongodb-client-encryption
