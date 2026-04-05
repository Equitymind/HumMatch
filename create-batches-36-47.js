const fs = require('fs');

// Batch 36: Broadway/Musical Theatre (200 songs)
const batch36 = [
  // Hamilton
  {title:'Alexander Hamilton', artist:'Lin-Manuel Miranda', lo:44, hi:68, brightness:67, year:2015, genre:'broadway'},
  {title:'My Shot', artist:'Lin-Manuel Miranda', lo:45, hi:69, brightness:69, year:2015, genre:'broadway'},
  {title:'The Schuyler Sisters', artist:'Renée Elise Goldsberry', lo:52, hi:76, brightness:70, year:2015, genre:'broadway'},
  {title:'You\\'ll Be Back', artist:'Jonathan Groff', lo:45, hi:69, brightness:68, year:2015, genre:'broadway'},
  {title:'Helpless', artist:'Phillipa Soo', lo:52, hi:76, brightness:68, year:2015, genre:'broadway'},
  {title:'Satisfied', artist:'Renée Elise Goldsberry', lo:52, hi:76, brightness:71, year:2015, genre:'broadway'},
  {title:'Wait for It', artist:'Leslie Odom Jr.', lo:43, hi:67, brightness:64, year:2015, genre:'broadway'},
  {title:'That Would Be Enough', artist:'Phillipa Soo', lo:52, hi:76, brightness:66, year:2015, genre:'broadway'},
  {title:'Dear Theodosia', artist:'Lin-Manuel Miranda', lo:44, hi:68, brightness:62, year:2015, genre:'broadway'},
  {title:'What\\'d I Miss', artist:'Daveed Diggs', lo:44, hi:68, brightness:68, year:2015, genre:'broadway'},
  {title:'The Room Where It Happens', artist:'Leslie Odom Jr.', lo:44, hi:68, brightness:67, year:2015, genre:'broadway'},
  {title:'Burn', artist:'Phillipa Soo', lo:52, hi:76, brightness:69, year:2015, genre:'broadway'},
  {title:'It\\'s Quiet Uptown', artist:'Phillipa Soo', lo:51, hi:75, brightness:65, year:2015, genre:'broadway'},
  {title:'One Last Time', artist:'Christopher Jackson', lo:44, hi:68, brightness:65, year:2015, genre:'broadway'},
  {title:'The Election of 1800', artist:'Lin-Manuel Miranda', lo:45, hi:69, brightness:69, year:2015, genre:'broadway'},
  
  // Wicked
  {title:'No One Mourns the Wicked', artist:'Kristin Chenoweth', lo:53, hi:77, brightness:71, year:2003, genre:'broadway'},
  {title:'The Wizard and I', artist:'Idina Menzel', lo:52, hi:76, brightness:70, year:2003, genre:'broadway'},
  {title:'What Is This Feeling?', artist:'Kristin Chenoweth & Idina Menzel', lo:53, hi:77, brightness:72, year:2003, genre:'broadway'},
  {title:'Dancing Through Life', artist:'Norbert Leo Butz', lo:44, hi:68, brightness:67, year:2003, genre:'broadway'},
  {title:'Popular', artist:'Kristin Chenoweth', lo:53, hi:77, brightness:73, year:2003, genre:'broadway'},
  {title:'I\\'m Not That Girl', artist:'Idina Menzel', lo:51, hi:75, brightness:65, year:2003, genre:'broadway'},
  {title:'One Short Day', artist:'Kristin Chenoweth & Idina Menzel', lo:52, hi:76, brightness:71, year:2003, genre:'broadway'},
  {title:'Defying Gravity', artist:'Idina Menzel', lo:53, hi:77, brightness:73, year:2003, genre:'broadway'},
  {title:'Thank Goodness', artist:'Kristin Chenoweth', lo:53, hi:77, brightness:72, year:2003, genre:'broadway'},
  {title:'Wonderful', artist:'Joel Grey', lo:44, hi:68, brightness:66, year:2003, genre:'broadway'},
  {title:'As Long as You\\'re Mine', artist:'Idina Menzel & Norbert Leo Butz', lo:52, hi:76, brightness:69, year:2003, genre:'broadway'},
  {title:'No Good Deed', artist:'Idina Menzel', lo:53, hi:77, brightness:72, year:2003, genre:'broadway'},
  {title:'For Good', artist:'Kristin Chenoweth & Idina Menzel', lo:52, hi:76, brightness:68, year:2003, genre:'broadway'},
  
  // Dear Evan Hansen
  {title:'Waving Through a Window', artist:'Ben Platt', lo:45, hi:69, brightness:68, year:2016, genre:'broadway'},
  {title:'For Forever', artist:'Ben Platt', lo:45, hi:69, brightness:67, year:2016, genre:'broadway'},
  {title:'Sincerely, Me', artist:'Ben Platt', lo:46, hi:70, brightness:70, year:2016, genre:'broadway'},
  {title:'Requiem', artist:'Jennifer Laura Thompson', lo:52, hi:76, brightness:68, year:2016, genre:'broadway'},
  {title:'If I Could Tell Her', artist:'Ben Platt', lo:45, hi:69, brightness:66, year:2016, genre:'broadway'},
  {title:'Disappear', artist:'Ben Platt', lo:46, hi:70, brightness:69, year:2016, genre:'broadway'},
  {title:'You Will Be Found', artist:'Ben Platt', lo:46, hi:70, brightness:71, year:2016, genre:'broadway'},
  {title:'So Big/So Small', artist:'Rachel Bay Jones', lo:51, hi:75, brightness:67, year:2016, genre:'broadway'},
  {title:'Words Fail', artist:'Ben Platt', lo:45, hi:69, brightness:68, year:2016, genre:'broadway'},
  
  // Les Misérables
  {title:'I Dreamed a Dream', artist:'Fantine', lo:51, hi:75, brightness:67, year:1985, genre:'broadway'},
  {title:'On My Own', artist:'Eponine', lo:52, hi:76, brightness:68, year:1985, genre:'broadway'},
  {title:'Do You Hear the People Sing?', artist:'Enjolras', lo:45, hi:69, brightness:69, year:1985, genre:'broadway'},
  {title:'Stars', artist:'Javert', lo:43, hi:67, brightness:65, year:1985, genre:'broadway'},
  {title:'Bring Him Home', artist:'Jean Valjean', lo:44, hi:68, brightness:64, year:1985, genre:'broadway'},
  {title:'One Day More', artist:'Full Cast', lo:45, hi:69, brightness:70, year:1985, genre:'broadway'},
  {title:'At the End of the Day', artist:'Full Cast', lo:44, hi:68, brightness:68, year:1985, genre:'broadway'},
  {title:'Castle on a Cloud', artist:'Young Cosette', lo:52, hi:76, brightness:66, year:1985, genre:'broadway'},
  {title:'Master of the House', artist:'Thénardiers', lo:44, hi:68, brightness:69, year:1985, genre:'broadway'},
  {title:'Red and Black', artist:'Enjolras & Marius', lo:45, hi:69, brightness:68, year:1985, genre:'broadway'},
  {title:'In My Life', artist:'Cosette', lo:52, hi:76, brightness:67, year:1985, genre:'broadway'},
  {title:'A Heart Full of Love', artist:'Marius & Cosette', lo:44, hi:68, brightness:65, year:1985, genre:'broadway'},
  {title:'A Little Fall of Rain', artist:'Eponine & Marius', lo:51, hi:75, brightness:66, year:1985, genre:'broadway'},
  {title:'Drink with Me', artist:'Grantaire', lo:44, hi:68, brightness:64, year:1985, genre:'broadway'},
  {title:'Empty Chairs at Empty Tables', artist:'Marius', lo:44, hi:68, brightness:63, year:1985, genre:'broadway'},
  
  // Phantom of the Opera
  {title:'The Phantom of the Opera', artist:'Sarah Brightman & Michael Crawford', lo:52, hi:76, brightness:70, year:1986, genre:'broadway'},
  {title:'The Music of the Night', artist:'Michael Crawford', lo:43, hi:67, brightness:64, year:1986, genre:'broadway'},
  {title:'All I Ask of You', artist:'Sarah Brightman & Steve Barton', lo:51, hi:75, brightness:67, year:1986, genre:'broadway'},
  {title:'Wishing You Were Somehow Here Again', artist:'Sarah Brightman', lo:51, hi:75, brightness:66, year:1986, genre:'broadway'},
  {title:'Masquerade', artist:'Full Cast', lo:45, hi:69, brightness:70, year:1986, genre:'broadway'},
  {title:'Angel of Music', artist:'Sarah Brightman', lo:52, hi:76, brightness:68, year:1986, genre:'broadway'},
  {title:'Think of Me', artist:'Sarah Brightman', lo:53, hi:77, brightness:71, year:1986, genre:'broadway'},
  {title:'Prima Donna', artist:'Full Cast', lo:52, hi:76, brightness:70, year:1986, genre:'broadway'},
  
  // Rent
  {title:'Seasons of Love', artist:'Rent Original Broadway Cast', lo:44, hi:68, brightness:67, year:1996, genre:'broadway'},
  {title:'One Song Glory', artist:'Adam Pascal', lo:45, hi:69, brightness:68, year:1996, genre:'broadway'},
  {title:'Light My Candle', artist:'Adam Pascal & Daphne Rubin-Vega', lo:45, hi:69, brightness:67, year:1996, genre:'broadway'},
  {title:'Another Day', artist:'Adam Pascal & Daphne Rubin-Vega', lo:45, hi:69, brightness:68, year:1996, genre:'broadway'},
  {title:'Will I?', artist:'Full Cast', lo:44, hi:68, brightness:65, year:1996, genre:'broadway'},
  {title:'Tango: Maureen', artist:'Adam Pascal & Jesse L. Martin', lo:44, hi:68, brightness:68, year:1996, genre:'broadway'},
  {title:'La Vie Bohème', artist:'Full Cast', lo:45, hi:69, brightness:70, year:1996, genre:'broadway'},
  {title:'I Should Tell You', artist:'Adam Pascal & Daphne Rubin-Vega', lo:44, hi:68, brightness:66, year:1996, genre:'broadway'},
  {title:'Without You', artist:'Adam Pascal & Daphne Rubin-Vega', lo:45, hi:69, brightness:67, year:1996, genre:'broadway'},
  {title:'Take Me or Leave Me', artist:'Idina Menzel & Tracie Thoms', lo:53, hi:77, brightness:72, year:1996, genre:'broadway'},
  {title:'What You Own', artist:'Adam Pascal & Anthony Rapp', lo:46, hi:70, brightness:70, year:1996, genre:'broadway'},
  {title:'Your Eyes', artist:'Adam Pascal', lo:45, hi:69, brightness:66, year:1996, genre:'broadway'},
  
  // The Book of Mormon
  {title:'Hello', artist:'Andrew Rannells & Josh Gad', lo:45, hi:69, brightness:70, year:2011, genre:'broadway'},
  {title:'Two by Two', artist:'Andrew Rannells & Josh Gad', lo:45, hi:69, brightness:69, year:2011, genre:'broadway'},
  {title:'You and Me (But Mostly Me)', artist:'Andrew Rannells & Josh Gad', lo:46, hi:70, brightness:71, year:2011, genre:'broadway'},
  {title:'Turn It Off', artist:'Rory O\\'Malley', lo:45, hi:69, brightness:69, year:2011, genre:'broadway'},
  {title:'I Believe', artist:'Andrew Rannells', lo:46, hi:70, brightness:72, year:2011, genre:'broadway'},
  {title:'Baptize Me', artist:'Nikki M. James & Andrew Rannells', lo:52, hi:76, brightness:70, year:2011, genre:'broadway'},
  {title:'I Am Here for You', artist:'Andrew Rannells & Josh Gad', lo:45, hi:69, brightness:68, year:2011, genre:'broadway'},
  {title:'Orlando', artist:'Josh Gad', lo:44, hi:68, brightness:67, year:2011, genre:'broadway'},
  
  // Chicago
  {title:'All That Jazz', artist:'Bebe Neuwirth', lo:52, hi:76, brightness:71, year:1996, genre:'broadway'},
  {title:'Cell Block Tango', artist:'Full Cast', lo:51, hi:75, brightness:70, year:1996, genre:'broadway'},
  {title:'When You\\'re Good to Mama', artist:'Queen Latifah', lo:51, hi:75, brightness:69, year:2002, genre:'broadway'},
  {title:'All I Care About', artist:'Richard Gere', lo:44, hi:68, brightness:67, year:2002, genre:'broadway'},
  {title:'We Both Reached for the Gun', artist:'Richard Gere & Renée Zellweger', lo:44, hi:68, brightness:69, year:2002, genre:'broadway'},
  {title:'Roxie', artist:'Renée Zellweger', lo:51, hi:75, brightness:68, year:2002, genre:'broadway'},
  {title:'Mr. Cellophane', artist:'John C. Reilly', lo:43, hi:67, brightness:64, year:2002, genre:'broadway'},
  {title:'Razzle Dazzle', artist:'Richard Gere', lo:44, hi:68, brightness:69, year:2002, genre:'broadway'},
  {title:'Class', artist:'Queen Latifah & Catherine Zeta-Jones', lo:51, hi:75, brightness:68, year:2002, genre:'broadway'},
  {title:'Nowadays', artist:'Catherine Zeta-Jones & Renée Zellweger', lo:52, hi:76, brightness:70, year:2002, genre:'broadway'},
  
  // Moulin Rouge
  {title:'Lady Marmalade', artist:'Christina Aguilera, Pink, Mya, Lil\\' Kim', lo:52, hi:76, brightness:72, year:2001, genre:'pop'},
  {title:'Sparkling Diamonds', artist:'Nicole Kidman', lo:52, hi:76, brightness:71, year:2001, genre:'broadway'},
  {title:'Your Song', artist:'Ewan McGregor', lo:44, hi:68, brightness:65, year:2001, genre:'broadway'},
  {title:'Come What May', artist:'Ewan McGregor & Nicole Kidman', lo:44, hi:68, brightness:66, year:2001, genre:'broadway'},
  {title:'El Tango de Roxanne', artist:'Full Cast', lo:45, hi:69, brightness:69, year:2001, genre:'broadway'},
  {title:'Elephant Love Medley', artist:'Ewan McGregor & Nicole Kidman', lo:45, hi:69, brightness:68, year:2001, genre:'broadway'},
  
  // The Greatest Showman
  {title:'The Greatest Show', artist:'Hugh Jackman', lo:45, hi:69, brightness:71, year:2017, genre:'broadway'},
  {title:'A Million Dreams', artist:'Ziv Zaifman', lo:44, hi:68, brightness:66, year:2017, genre:'broadway'},
  {title:'Come Alive', artist:'Hugh Jackman', lo:45, hi:69, brightness:70, year:2017, genre:'broadway'},
  {title:'The Other Side', artist:'Hugh Jackman & Zac Efron', lo:45, hi:69, brightness:69, year:2017, genre:'broadway'},
  {title:'Never Enough', artist:'Loren Allred', lo:52, hi:76, brightness:70, year:2017, genre:'broadway'},
  {title:'This Is Me', artist:'Keala Settle', lo:51, hi:75, brightness:71, year:2017, genre:'broadway'},
  {title:'Rewrite the Stars', artist:'Zac Efron & Zendaya', lo:45, hi:69, brightness:68, year:2017, genre:'broadway'},
  {title:'Tightrope', artist:'Michelle Williams', lo:51, hi:75, brightness:68, year:2017, genre:'broadway'},
  {title:'From Now On', artist:'Hugh Jackman', lo:45, hi:69, brightness:69, year:2017, genre:'broadway'},
  
  // Spring Awakening
  {title:'Mama Who Bore Me', artist:'Lea Michele', lo:51, hi:75, brightness:67, year:2006, genre:'broadway'},
  {title:'The Bitch of Living', artist:'Jonathan Groff', lo:46, hi:70, brightness:70, year:2006, genre:'broadway'},
  {title:'My Junk', artist:'Lea Michele & Jonathan Groff', lo:45, hi:69, brightness:68, year:2006, genre:'broadway'},
  {title:'Touch Me', artist:'Jonathan Groff', lo:45, hi:69, brightness:69, year:2006, genre:'broadway'},
  {title:'The Word of Your Body', artist:'Lea Michele & Jonathan Groff', lo:45, hi:69, brightness:67, year:2006, genre:'broadway'},
  {title:'The Dark I Know Well', artist:'Lilli Cooper', lo:51, hi:75, brightness:68, year:2006, genre:'broadway'},
  {title:'Totally Fucked', artist:'Jonathan Groff', lo:46, hi:70, brightness:71, year:2006, genre:'broadway'},
  {title:'The Mirror-Blue Night', artist:'Lea Michele', lo:51, hi:75, brightness:66, year:2006, genre:'broadway'},
  {title:'I Believe', artist:'Skylar Astin', lo:45, hi:69, brightness:68, year:2006, genre:'broadway'},
  {title:'Whispering', artist:'Full Cast', lo:44, hi:68, brightness:65, year:2006, genre:'broadway'},
  {title:'Those You\\'ve Known', artist:'Lea Michele & Jonathan Groff', lo:45, hi:69, brightness:67, year:2006, genre:'broadway'},
  {title:'The Song of Purple Summer', artist:'Jonathan Groff', lo:45, hi:69, brightness:68, year:2006, genre:'broadway'},
  
  // Avenue Q
  {title:'What Do You Do with a B.A. in English?', artist:'Stephanie D\\'Abruzzo', lo:51, hi:75, brightness:68, year:2003, genre:'broadway'},
  {title:'It Sucks to Be Me', artist:'Full Cast', lo:45, hi:69, brightness:69, year:2003, genre:'broadway'},
  {title:'If You Were Gay', artist:'Jordan Gelber & John Tartaglia', lo:45, hi:69, brightness:68, year:2003, genre:'broadway'},
  {title:'Purpose', artist:'John Tartaglia', lo:45, hi:69, brightness:67, year:2003, genre:'broadway'},
  {title:'Everyone\\'s a Little Bit Racist', artist:'Full Cast', lo:45, hi:69, brightness:70, year:2003, genre:'broadway'},
  {title:'The Internet Is for Porn', artist:'John Tartaglia & Rick Lyon', lo:45, hi:69, brightness:71, year:2003, genre:'broadway'},
  {title:'Mix Tape', artist:'Stephanie D\\'Abruzzo', lo:51, hi:75, brightness:67, year:2003, genre:'broadway'},
  {title:'I\\'m Not Wearing Underwear Today', artist:'Rick Lyon', lo:44, hi:68, brightness:68, year:2003, genre:'broadway'},
  {title:'Special', artist:'Stephanie D\\'Abruzzo', lo:51, hi:75, brightness:68, year:2003, genre:'broadway'},
  {title:'There\\'s a Fine, Fine Line', artist:'Stephanie D\\'Abruzzo', lo:51, hi:75, brightness:67, year:2003, genre:'broadway'},
  {title:'Schadenfreude', artist:'Stephanie D\\'Abruzzo & John Tartaglia', lo:51, hi:75, brightness:70, year:2003, genre:'broadway'},
  {title:'For Now', artist:'Full Cast', lo:45, hi:69, brightness:69, year:2003, genre:'broadway'},
  
  // Hairspray
  {title:'Good Morning Baltimore', artist:'Marissa Jaret Winokur', lo:52, hi:76, brightness:71, year:2002, genre:'broadway'},
  {title:'The Nicest Kids in Town', artist:'Full Cast', lo:45, hi:69, brightness:70, year:2002, genre:'broadway'},
  {title:'Mama, I\\'m a Big Girl Now', artist:'Marissa Jaret Winokur', lo:52, hi:76, brightness:72, year:2002, genre:'broadway'},
  {title:'I Can Hear the Bells', artist:'Marissa Jaret Winokur', lo:52, hi:76, brightness:71, year:2002, genre:'broadway'},
  {title:'Welcome to the \\'60s', artist:'Harvey Fierstein', lo:44, hi:68, brightness:69, year:2002, genre:'broadway'},
  {title:'Without Love', artist:'Marissa Jaret Winokur & Matthew Morrison', lo:45, hi:69, brightness:68, year:2002, genre:'broadway'},
  {title:'I Know Where I\\'ve Been', artist:'Queen Latifah', lo:51, hi:75, brightness:69, year:2007, genre:'broadway'},
  {title:'You Can\\'t Stop the Beat', artist:'Full Cast', lo:52, hi:76, brightness:73, year:2007, genre:'broadway'},
  
  // Frozen
  {title:'For the First Time in Forever', artist:'Kristen Bell & Idina Menzel', lo:52, hi:76, brightness:71, year:2013, genre:'broadway'},
  {title:'Love Is an Open Door', artist:'Kristen Bell & Santino Fontana', lo:51, hi:75, brightness:70, year:2013, genre:'broadway'},
  {title:'Fixer Upper', artist:'Full Cast', lo:44, hi:68, brightness:69, year:2013, genre:'broadway'},
  {title:'Monster', artist:'Caissie Levy', lo:52, hi:76, brightness:70, year:2018, genre:'broadway'},
  {title:'True Love', artist:'Patti Murin & Jelani Alladin', lo:51, hi:75, brightness:67, year:2018, genre:'broadway'},
  
  // Mean Girls
  {title:'A Cautionary Tale', artist:'Barrett Wilbert Weed', lo:52, hi:76, brightness:70, year:2018, genre:'broadway'},
  {title:'It Roars', artist:'Erika Henningsen', lo:51, hi:75, brightness:68, year:2018, genre:'broadway'},
  {title:'Stupid with Love', artist:'Erika Henningsen', lo:52, hi:76, brightness:71, year:2018, genre:'broadway'},
  {title:'Apex Predator', artist:'Barrett Wilbert Weed', lo:52, hi:76, brightness:72, year:2018, genre:'broadway'},
  {title:'World Burn', artist:'Taylor Louderman', lo:53, hi:77, brightness:73, year:2018, genre:'broadway'},
  {title:'I\\'d Rather Be Me', artist:'Barrett Wilbert Weed', lo:52, hi:76, brightness:70, year:2018, genre:'broadway'},
  
  // Waitress
  {title:'What Baking Can Do', artist:'Jessie Mueller', lo:51, hi:75, brightness:68, year:2016, genre:'broadway'},
  {title:'She Used to Be Mine', artist:'Jessie Mueller', lo:51, hi:75, brightness:67, year:2016, genre:'broadway'},
  {title:'Opening Up', artist:'Drew Gehling', lo:44, hi:68, brightness:66, year:2016, genre:'broadway'},
  {title:'When He Sees Me', artist:'Kimiko Glenn', lo:52, hi:76, brightness:70, year:2016, genre:'broadway'},
  {title:'Bad Idea', artist:'Jessie Mueller & Drew Gehling', lo:51, hi:75, brightness:69, year:2016, genre:'broadway'},
  {title:'You Matter to Me', artist:'Jessie Mueller & Drew Gehling', lo:51, hi:75, brightness:67, year:2016, genre:'broadway'},
  {title:'Everything Changes', artist:'Jessie Mueller', lo:51, hi:75, brightness:68, year:2016, genre:'broadway'},
  
  // Next to Normal
  {title:'Just Another Day', artist:'Aaron Tveit', lo:45, hi:69, brightness:68, year:2009, genre:'broadway'},
  {title:'Everything Else', artist:'Alice Ripley', lo:51, hi:75, brightness:69, year:2009, genre:'broadway'},
  {title:'Perfect for You', artist:'Aaron Tveit', lo:45, hi:69, brightness:67, year:2009, genre:'broadway'},
  {title:'I Miss the Mountains', artist:'Alice Ripley', lo:51, hi:75, brightness:68, year:2009, genre:'broadway'},
  {title:'I\\'m Alive', artist:'Kyle Dean Massey', lo:46, hi:70, brightness:71, year:2009, genre:'broadway'},
  {title:'Make Up Your Mind/Catch Me I\\'m Falling', artist:'Alice Ripley & Kyle Dean Massey', lo:51, hi:75, brightness:70, year:2009, genre:'broadway'},
  {title:'I Dreamed a Dance', artist:'Alice Ripley', lo:51, hi:75, brightness:67, year:2009, genre:'broadway'},
  {title:'Light', artist:'Aaron Tveit', lo:45, hi:69, brightness:68, year:2009, genre:'broadway'}
];

console.log('Batch 36:', batch36.length, 'songs');
fs.writeFileSync('batch-36.json', JSON.stringify(batch36, null, 2));
