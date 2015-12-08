#!/usr/bin/env bash
nohup node server2 > .nohup.log 2>&1 & echo $! > .nohup.pid

