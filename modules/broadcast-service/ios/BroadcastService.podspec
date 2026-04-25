require 'json'
package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'BroadcastService'
  s.version        = package['version']
  s.summary        = 'Audio session + interruption observer for Khanqah live broadcast'
  s.author         = 'ennbi'
  s.homepage       = 'https://github.com/ennbi/khanqah'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.4'
  s.source         = { git: '' }
  s.source_files   = '**/*.{h,m,swift}'
  s.dependency 'ExpoModulesCore'
  s.license        = 'MIT'
end
