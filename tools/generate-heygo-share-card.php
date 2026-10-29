<?php
$image=imagecreatetruecolor(1200,630);
$forest=imagecolorallocate($image,6,78,59);$white=imagecolorallocate($image,255,255,255);$mint=imagecolorallocate($image,56,216,120);$soft=imagecolorallocate($image,192,235,211);$deep=imagecolorallocate($image,4,60,46);
imagefill($image,0,0,$forest);
$bold=$argv[3] ?? '/System/Library/Fonts/Supplemental/Arial Bold.ttf';$regular=$argv[4] ?? '/System/Library/Fonts/Supplemental/Arial.ttf';
$logo=imagecreatefrompng($argv[1]);imagealphablending($image,true);imagecopyresampled($image,$logo,68,42,0,0,230,89,imagesx($logo),imagesy($logo));
imageline($image,330,54,330,112,$soft);imagettftext($image,32,0,357,99,$white,$bold,'Voice');
imagettftext($image,57,0,68,263,$white,$bold,'Ideas from riders');imagettftext($image,57,0,68,345,$white,$bold,'and drivers.');
imagettftext($image,27,0,70,417,$soft,$regular,'A better heyGo for everyone.');
imagefilledrectangle($image,70,483,600,536,$deep);imagettftext($image,19,0,92,517,$white,$regular,'Share ideas. Vote. Join the conversation.');
imagettftext($image,18,0,70,590,$soft,$regular,'ideas.heygo.ng');
// A simple voting conversation motif; no invented testimonials or metrics.
imagefilledellipse($image,1024,390,290,290,$deep);imagefilledellipse($image,1024,390,230,230,$forest);
imagesetthickness($image,10);imageline($image,966,387,995,416,$mint);imageline($image,995,416,1069,339,$mint);
imagefilledellipse($image,1130,174,20,20,$mint);imagefilledellipse($image,902,540,14,14,$mint);
imagepng($image,$argv[2],9);
