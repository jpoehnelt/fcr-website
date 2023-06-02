#!/bin/bash
# docker run  -v $PWD:/website --entrypoint="/bin/sh" -it dpokidov/imagemagick
# find /website -type f -iname "*.jpeg" -exec mogrify -verbose -format jpeg -layers Dispose -resize 1024\>x1024\> -quality 75% {} +
# find /website -type f -iname "*.jpg" -exec mogrify -verbose -format jpg -layers Dispose -resize 1024\>x1024\> -quality 75% {} +
# find /website -type f -iname "*.png" -exec mogrify -verbose -format png -alpha on -layers Dispose -resize 1024\>x1024\> {} +


find ./ -type f -iname "*.pdf" -exec gs -sDEVICE=pdfwrite -dDownsampleColorImages=true \
  -dColorImageResolution=72 \
  -dGrayImageResolution=72 \
  -dMonoImageResolution=72 \
  -dNOPAUSE -dQUIET -dBATCH \
  -sOutputFile={}.new {} \; -exec mv {}.new {} \;