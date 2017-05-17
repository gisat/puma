#!/bin/bash

DOWNLOAD_DIR=/mnt/sde1_750gb/igokr/night_light
WORK_DIR=/home/docker-share/night_light

function download() {
  # TODO
  :
}

function extract() {
  for tgz in ${DOWNLOAD_DIR}/SVDNB_npp_*.tgz
  do
    tar -xv -C ${WORK_DIR} -zf ${tgz} '*_vcm-orm-ntl_*'
  done
}

function load() {
  raster2pgsql -I -M -C -F -s 4326 -t 1024x1024 ${WORK_DIR}/*.tif public.night_light \
    | psql -U geonode -d geonode_data
}

load
