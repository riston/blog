# Blog example

To run the example you need node.js and some initalized data into mongodb. The collections are user, post.
   
Adding init data to mongoDB(located in data directory), test user is admin and password is also admin
	
	mongoimport -d blog -c user init.js

Run the blog

    node app.js
