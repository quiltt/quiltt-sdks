# Tooling-only Gemfile (Fastlane). No Gemfile.lock is committed, so every
# `bundle install` resolves the newest compatible version of each gem.
#
# Keep this list to gems we require directly and that nothing else pulls in.
# Adding a transitive dependency (json, excon, faraday, rubyzip, bigdecimal)
# makes Bundler's resolver backtrack and can silently resolve `fastlane` down
# to 0.0.1, a placeholder gem with no executables - `bundle exec fastlane` then
# fails. Verify with `bundle lock` that fastlane is still 2.x after any edit.
source 'https://rubygems.org'

gem 'fastlane'

# Required directly by packages/*/fastlane/Fastfile; not dependencies of fastlane.
gem 'octokit'
gem 'semantic'
