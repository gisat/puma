#!/usr/bin/env bash
nohup node ~/countryStats/importAndCalculateCountryStats.js master 15 92657 && \
    psql -U postgres -f /home/jbalhar/result.sql && \
    psql -U postgres -f /home/jbalhar/countryStats/aggregate.sql &
